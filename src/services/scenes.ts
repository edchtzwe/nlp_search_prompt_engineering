import fs from 'fs/promises';
import path from 'path';
import { type PoolClient } from 'pg';
import pool from '@/database.ts';
import { aiFactory } from '@/services/AIFactory.ts';
import { createVideoScene } from '@/models/video_scenes.ts';
import { EMBEDDING_MODEL, PROVIDER_NAME } from './GoogleAIProvider.ts';

export interface ManifestData {
    sourceVideoId: string;
    scenes: SceneInput[];
}

export interface SceneInput {
    startTime: number;
    endTime: number;
    scene: string;
}

export interface IngestResult {
    success: boolean;
    count: number;
    message: string;
}

const ISOBMFF_DIR = process.env.ISOBMFF_DIR || '';

/**
 * Validates folder existence, generates embeddings, and stores scenes in DB.
 */
export const ingestScenes = async (
    sourceVideoId: string,
    scenes: SceneInput[]
): Promise<IngestResult> => {
    // 1. Validate Environment
    if (!ISOBMFF_DIR) {
        throw new Error('SERVER_CONFIG_ERROR: ISOBMFF_DIR not set');
    }

    // 2. Validate File System
    const videoPath = path.join(ISOBMFF_DIR, sourceVideoId);
    try {
        await fs.access(videoPath);
    } catch {
        throw new Error(
            `NOT_FOUND: Video source folder not found: ${sourceVideoId}`
        );
    }

    // 3. Initialize AI
    let aiProvider;
    try {
        aiProvider = aiFactory(PROVIDER_NAME);
    } catch {
        throw new Error('AI_INIT_ERROR: Failed to initialize AI provider');
    }

    const client: PoolClient = await pool.connect();

    try {
        await client.query('BEGIN');

        // 4. Process Scenes
        for (const scene of scenes) {
            // Generate Embedding
            const embedding = await aiProvider.generateEmbedding(scene.scene);

            // Format for pgvector
            const vectorString = JSON.stringify(embedding);

            // Use the functional model for DB insertion
            await createVideoScene(
                {
                    source_video_id: sourceVideoId,
                    start_time: scene.startTime,
                    end_time: scene.endTime,
                    content: scene.scene,
                    embedding: vectorString,
                    ai_provider: PROVIDER_NAME,
                    ai_model: EMBEDDING_MODEL,
                },
                client
            );
        }

        await client.query('COMMIT');

        return {
            success: true,
            count: scenes.length,
            message: 'Scenes ingested successfully',
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const parseManifest = (fileContent: string): ManifestData => {
    // 1. Strip Comments (JSONC support)
    // This regex safely removes // and /* */ comments while ignoring those inside strings
    const jsonString = fileContent.replace(
        /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
        (m, g) => (g ? '' : m)
    );

    let data;
    try {
        data = JSON.parse(jsonString);
    } catch {
        throw new Error('MANIFEST_PARSE_ERROR: Invalid JSON format');
    }

    // 2. Validate Root Structure
    if (!data.source_video || typeof data.source_video !== 'string') {
        throw new Error(
            'MANIFEST_VALIDATION_ERROR: Missing or invalid "source_video" (UUID string)'
        );
    }

    if (!Array.isArray(data.scenes)) {
        throw new Error(
            'MANIFEST_VALIDATION_ERROR: Missing or invalid "scenes" (Array)'
        );
    }

    // 3. Validate Scenes Array
    // We check this here to fail fast before hitting the DB/AI services
    const isValidScenes = data.scenes.every(
        (s: Record<string, unknown>) =>
            typeof s.startTime === 'number' &&
            typeof s.endTime === 'number' &&
            typeof s.scene === 'string'
    );

    if (!isValidScenes) {
        throw new Error(
            'MANIFEST_VALIDATION_ERROR: Invalid scene structure. Required: { startTime: number, endTime: number, scene: string }'
        );
    }

    return {
        sourceVideoId: data.source_video,
        scenes: data.scenes,
    };
};

export const attachManifest = async (sourceVideoId: string, fileContent: string): Promise<string> => {
    if (!ISOBMFF_DIR) {
        throw new Error('SERVER_CONFIG_ERROR: ISOBMFF_DIR not set');
    }

    const targetDir = path.join(ISOBMFF_DIR, sourceVideoId);

    // 1. Ensure the video folder exists
    try {
        await fs.access(targetDir);
    } catch {
        throw new Error(`NOT_FOUND: Video source folder not found: ${sourceVideoId}`);
    }

    // 2. Save the file (manifest.jsonc)
    const targetPath = path.join(targetDir, 'manifest.jsonc');
    await fs.writeFile(targetPath, fileContent);

    return targetPath;
};

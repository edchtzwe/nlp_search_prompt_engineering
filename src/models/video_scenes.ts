import pool from '@/database.ts';
import { Pool, type PoolClient } from 'pg';

export const DEFAULT_NLP_HIT_COUNT = 50;
export const DEFAULT_VECTOR_THRESHOLD = 0.45;

export interface VideoScene {
    id: string;
    source_video_id: string;
    start_time: number;
    end_time: number;
    content: string;
    name?: string;
    embedding: string; // pgvector returns this as a string representation
    ai_provider: string;
    ai_model: string;
    created_at: Date;
    updated_at: Date;
    similarity?: number; // Populated only during search
    source_video?: Record<string, unknown>;
}

export interface CreateVideoSceneParams {
    source_video_id: string;
    start_time: number;
    end_time: number;
    content: string;
    name?: string;
    embedding: string; // JSON string format '[0.1, 0.2, ...]'
    ai_provider: string;
    ai_model: string;
}

/**
 * Inserts a new video scene.
 * Accepts an optional client to support transactions (required by IngestService).
 */
export const createVideoScene = async (
    params: CreateVideoSceneParams,
    client: Pool | PoolClient = pool
): Promise<VideoScene> => {
    const result = await client.query<VideoScene>(
        `INSERT INTO discovery_showcase.video_scenes 
     (source_video_id, start_time, end_time, content, embedding, ai_provider, ai_model, name) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
     RETURNING *`,
        [
            params.source_video_id,
            params.start_time,
            params.end_time,
            params.content,
            params.embedding,
            params.ai_provider,
            params.ai_model,
            params.name || null, // Handle optional name
        ]
    );

    return result.rows[0];
};

/**
 * Deletes all scenes associated with a specific source video.
 * Useful for cleanup before re-ingesting.
 */
export const deleteScenesBySourceVideoId = async (
    sourceVideoId: string,
    client: Pool | PoolClient = pool
): Promise<boolean> => {
    const result = await client.query(
        'DELETE FROM discovery_showcase.video_scenes WHERE source_video_id = $1',
        [sourceVideoId]
    );

    return (result.rowCount ?? 0) > 0;
};

/**
 * Get all scenes for a specific video, ordered by time.
 */
export const getScenesBySourceVideoId = async (
    sourceVideoId: string
): Promise<VideoScene[]> => {
    const result = await pool.query<VideoScene>(
        `SELECT * FROM discovery_showcase.video_scenes 
     WHERE source_video_id = $1 
     ORDER BY start_time ASC`,
        [sourceVideoId]
    );

    return result.rows;
};

export const findSimilarScenes = async (
    vectorString: string,
    options: {
        sourceVideoIds?: string[];
        limit?: number;
        threshold?: number;
    }
): Promise<VideoScene[]> => {
    const {
        sourceVideoIds,
        limit = DEFAULT_NLP_HIT_COUNT,
        threshold = DEFAULT_VECTOR_THRESHOLD
    } = options;

    const params: (string | number | string[])[] = [vectorString, threshold];
    let paramIndex = 3;

    let query = `
      SELECT
        vs.id,
        vs.source_video_id,
        vs.start_time,
        vs.end_time,
        vs.content,
        vs.name,
        1 - (vs.embedding <=> $1) as similarity,
        row_to_json(sv.*) as source_video
      FROM discovery_showcase.video_scenes vs
      JOIN discovery_showcase.source_video sv ON vs.source_video_id = sv.id
      WHERE 1 - (vs.embedding <=> $1) > $2
    `;

    // DYNAMIC FILTERING: Check if we are restricting the search scope
    if (sourceVideoIds && sourceVideoIds.length > 0) {
        query += ` AND vs.source_video_id = ANY($${paramIndex})`;
        params.push(sourceVideoIds);
        paramIndex++;
    }

    query += ` ORDER BY vs.source_video_id, (vs.embedding <=> $1) ASC`;
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await pool.query(query, params);
    return rows;
};

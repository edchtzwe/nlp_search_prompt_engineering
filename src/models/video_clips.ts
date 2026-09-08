import pool from '@/database.ts';
import { v4 as uuidv4 } from 'uuid';

const { DB_SCHEMA } = process.env;

if (!DB_SCHEMA) {
    throw new Error('Missing env var: DB_SCHEMA');
}

const VIDEO_CLIPS_TABLE = `${DB_SCHEMA}.video_clips`;

interface VideoClipCreateData {
    sourceVideoId: string;
    startTime: number;
    endTime: number;
    name?: string;
}

export interface VideoClip extends VideoClipCreateData {
    id: string;
    name?: string;
    created_at: Date;
    updated_at: Date;
}

export const createVideoClip = async (
    data: VideoClipCreateData,
    id?: string
): Promise<VideoClip> => {
    const clipId = id || uuidv4();

    const result = await pool.query<VideoClip>(
        `INSERT INTO ${VIDEO_CLIPS_TABLE}
         (id, source_video_id, start_time, end_time, name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [clipId, data.sourceVideoId, data.startTime, data.endTime, data.name ?? null]
    );

    return result.rows[0];
};

export const getVideoClipsBySourceVideo = async (
    sourceVideoId: string
): Promise<VideoClip[]> => {
    const result = await pool.query<VideoClip>(
        `SELECT
            id,
            source_video_id AS "sourceVideoId",
            start_time AS "startTime",
            end_time AS "endTime",
            name,
            created_at,
            updated_at
         FROM ${VIDEO_CLIPS_TABLE}
         WHERE source_video_id = $1
         ORDER BY start_time ASC`,
        [sourceVideoId]
    );

    console.info(result.rows);

    return result.rows;
};

export const getVideoClip = async (
    id: string
): Promise<VideoClip[] | undefined> => {
    const result = await pool.query<VideoClip>(
        `SELECT * FROM ${VIDEO_CLIPS_TABLE} WHERE id = $1`,
        [id]
    );

    return result.rows;
};

export const getAllVideoClips = async (): Promise<VideoClip[]> => {
    const result = await pool.query<VideoClip>(
        `SELECT
            id,
            source_video_id AS "sourceVideoId",
            start_time AS "startTime",
            end_time AS "endTime",
            name,
            created_at,
            updated_at
         FROM ${VIDEO_CLIPS_TABLE}
         ORDER BY created_at DESC`
    );

    return result.rows;
};


export const deleteVideoClip = async (id: string): Promise<boolean> => {
    const result = await pool.query(
        `DELETE FROM ${VIDEO_CLIPS_TABLE} WHERE id = $1`,
        [id]
    );

    return result.rowCount === 1;
};

export const renameVideoClip = async (
    clipUUID: string,
    name: string
): Promise<VideoClip | undefined> => {
    const result = await pool.query<VideoClip>(
        `UPDATE ${VIDEO_CLIPS_TABLE}
         SET name = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [clipUUID, name]
    );

    return result.rows[0];
};
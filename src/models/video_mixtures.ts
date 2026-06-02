import pool from '@/database.ts';

// --- Interfaces ---

export interface VideoMixture {
    id: string;
    videoMixtureUuid: string;
    clipVideoUuid: string;
    // name?: string; // REMOVED: Column migrated to metadata table
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface VideoMixtureMetadata {
    videoMixtureUuid: string;
    name?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MixtureCreationItem {
    clipVideoUuid: string;
    order: number;
    // name?: string; // REMOVED: Item level name no longer supported in this context
}

export interface VideoMixtureSourceDetail {
    mixtureItemId: string;
    videoMixtureUuid: string;
    order: number;
    // mixtureName?: string; // REMOVED: Column migrated

    clipUuid: string;
    clipStartTime: number;
    clipEndTime: number;

    sourceVideoId: string;
    sourceName: string;
}

// --- Mappers ---

const mapRow = (row: Record<string, unknown>): VideoMixture => ({
    id: row.id as string,
    videoMixtureUuid: row.video_mixture_uuid as string,
    clipVideoUuid: row.clip_video_uuid as string,
    // name: row.name, // REMOVED
    order: row.order as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
});

const mapMetadataRow = (row: Record<string, unknown>): VideoMixtureMetadata => ({
    videoMixtureUuid: row.video_mixture_uuid as string,
    name: row.name as string | undefined,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
});

const mapSourceDetail = (row: Record<string, unknown>): VideoMixtureSourceDetail => ({
    mixtureItemId: row.mixture_item_id as string,
    videoMixtureUuid: row.video_mixture_uuid as string,
    order: row.order as number,
    // mixtureName: row.mixture_name, // REMOVED

    clipUuid: row.clip_uuid as string,
    clipStartTime: parseFloat(row.clip_start_time as string),
    clipEndTime: parseFloat(row.clip_end_time as string),

    sourceVideoId: row.source_video_id as string,
    sourceName: row.source_name as string,
});

// --- Functions ---

/**
 * Get the catalog of all video mixtures from the metadata table.
 */
export const getVideoMixturesCatalog = async (): Promise<VideoMixtureMetadata[]> => {
    const result = await pool.query(
        `SELECT * FROM discovery_showcase.video_mixtures_metadata 
         ORDER BY created_at DESC`
    );

    return result.rows.map(mapMetadataRow);
};

export const createVideoMixture = async (
    item: MixtureCreationItem,
    videoMixtureUuid: string
): Promise<VideoMixture> => {
    // UPDATED: Removed 'name' from insert
    const query = `
        INSERT INTO discovery_showcase.video_mixtures 
        (video_mixture_uuid, clip_video_uuid, "order")
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    const params = [
        videoMixtureUuid,
        item.clipVideoUuid,
        item.order || 1
    ];

    const result = await pool.query(query, params);

    return mapRow(result.rows[0]);
};

export const getVideoMixturesByMixtureUuid = async (
    videoMixtureUuid: string
): Promise<VideoMixture[]> => {
    const result = await pool.query(
        `SELECT * FROM discovery_showcase.video_mixtures 
         WHERE video_mixture_uuid = $1 
         ORDER BY "order" ASC`,
        [videoMixtureUuid]
    );

    return result.rows.map(mapRow);
};

export const getVideoMixturesByClipUuid = async (
    clipVideoUuid: string
): Promise<VideoMixture[]> => {
    const result = await pool.query(
        `SELECT * FROM discovery_showcase.video_mixtures 
         WHERE clip_video_uuid = $1 
         ORDER BY created_at DESC`,
        [clipVideoUuid]
    );

    return result.rows.map(mapRow);
};

export const getVideoMixtureSources = async (
    videoMixtureUuid: string
): Promise<VideoMixtureSourceDetail[]> => {
    // UPDATED: Removed 'm.name' from selection
    const query = `
        SELECT
            m.id AS mixture_item_id,
            m.video_mixture_uuid,
            m."order",
            
            c.id AS clip_uuid,
            c.start_time AS clip_start_time,
            c.end_time AS clip_end_time,
            
            s.id AS source_video_id,
            s.original_name AS source_name
        FROM discovery_showcase.video_mixtures m
        JOIN discovery_showcase.video_clips c ON m.clip_video_uuid = c.id
        JOIN discovery_showcase.source_video s ON c.source_video_id = s.id
        WHERE m.video_mixture_uuid = $1
        ORDER BY m."order" ASC
    `;

    const result = await pool.query(query, [videoMixtureUuid]);

    return result.rows.map(mapSourceDetail);
};

export const deleteVideoMixture = async (id: string): Promise<boolean> => {
    const result = await pool.query(
        'DELETE FROM discovery_showcase.video_mixtures WHERE id = $1',
        [id]
    );

    return (result.rowCount ?? 0) > 0;
};

export const deleteVideoMixturesByMixtureUuid = async (
    videoMixtureUuid: string
): Promise<boolean> => {
    const result = await pool.query(
        'DELETE FROM discovery_showcase.video_mixtures WHERE video_mixture_uuid = $1',
        [videoMixtureUuid]
    );

    return (result.rowCount ?? 0) > 0;
};

/**
 * Renames the mixture in the metadata table.
 */
export const renameVideoMixture = async (
    videoMixtureUuid: string,
    name: string
): Promise<VideoMixtureMetadata> => {
    // UPDATED: Uses Upsert (Insert on Conflict Update)
    const result = await pool.query(
        `INSERT INTO discovery_showcase.video_mixtures_metadata 
            (video_mixture_uuid, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (video_mixture_uuid) 
         DO UPDATE SET 
            name = EXCLUDED.name,
            updated_at = NOW()
         RETURNING *`,
        [videoMixtureUuid, name]
    );

    // No need to check for length === 0, upsert always returns a row
    return mapMetadataRow(result.rows[0]);
};

export const deleteOrphanVideoMixtureMetadata = async (): Promise<number> => {
    const result = await pool.query(`
        DELETE FROM discovery_showcase.video_mixtures_metadata
        WHERE video_mixture_uuid NOT IN (
            SELECT DISTINCT video_mixture_uuid FROM discovery_showcase.video_mixtures
        )
    `);
    return result.rowCount || 0;
};
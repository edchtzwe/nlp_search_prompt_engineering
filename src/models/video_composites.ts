import pool from '@/database.ts';

const { DB_SCHEMA } = process.env;

if (!DB_SCHEMA) {
    throw new Error('Missing env var: DB_SCHEMA');
}

const VIDEO_COMPOSITES_TABLE = `${DB_SCHEMA}.video_composites`;
const VIDEO_COMPOSITES_METADATA_TABLE = `${DB_SCHEMA}.video_composites_metadata`;

export interface VideoComposite {
    id: string;
    sourceVideoId: string;
    compositeVideoUuid: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface VideoCompositeMetadata {
    videoCompositeUuid: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Helper: Map DB SnakeCase -> App CamelCase
const mapRow = (row: Record<string, unknown>): VideoComposite => ({
    id: row.id as string,
    sourceVideoId: row.source_video_id as string,
    compositeVideoUuid: row.composite_video_uuid as string,
    order: row.order as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
});

const mapMetadataRow = (row: Record<string, unknown>): VideoCompositeMetadata => ({
    videoCompositeUuid: row.composite_video_uuid as string,
    name: row.name as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
});

export const createVideoComposites = async (
    sourceVideoIds: string[],
    compositeVideoUuid: string
): Promise<VideoComposite[]> => {
    if (!sourceVideoIds || sourceVideoIds.length === 0) return [];

    const placeholders = sourceVideoIds.map((_, index) => {
        const offset = index * 3;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    }).join(', ');

    const params: (string | number)[] = [];
    sourceVideoIds.forEach((sourceId, index) => {
        params.push(sourceId);
        params.push(compositeVideoUuid);
        params.push(index + 1);
    });

    const query = `
        INSERT INTO ${VIDEO_COMPOSITES_TABLE}
        (source_video_id, composite_video_uuid, "order")
        VALUES ${placeholders}
        RETURNING *
    `;

    const result = await pool.query(query, params);

    return result.rows.map(mapRow);
};

export const getVideoCompositesByCompositeUuid = async (
    compositeVideoUuid: string
): Promise<VideoComposite[]> => {
    const result = await pool.query(
        `SELECT * FROM ${VIDEO_COMPOSITES_TABLE}
         WHERE composite_video_uuid = $1
         ORDER BY "order" ASC`,
        [compositeVideoUuid]
    );

    return result.rows.map(mapRow);
};

export const getVideoCompositesBySourceUuid = async (
    sourceVideoId: string
): Promise<VideoComposite[]> => {
    const result = await pool.query(
        `SELECT * FROM ${VIDEO_COMPOSITES_TABLE}
         WHERE source_video_id = $1
         ORDER BY "order" ASC`,
        [sourceVideoId]
    );

    return result.rows.map(mapRow);
};

export const setVideoCompositeName = async (
    compositeVideoUuid: string,
    name: string
): Promise<VideoCompositeMetadata> => {
    // UPSERT using ON CONFLICT since compositeVideoUuid is now PK
    const result = await pool.query(
        `INSERT INTO ${VIDEO_COMPOSITES_METADATA_TABLE}
         (composite_video_uuid, name)
         VALUES ($1, $2)
         ON CONFLICT (composite_video_uuid)
         DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = NOW()
         RETURNING *`,
        [compositeVideoUuid, name]
    );

    return mapMetadataRow(result.rows[0]);
};

export const getVideoCompositeMetadata = async (
    videoCompositeUuid: string
): Promise<VideoCompositeMetadata | null> => {
    const result = await pool.query(
        `SELECT * FROM ${VIDEO_COMPOSITES_METADATA_TABLE}
         WHERE composite_video_uuid = $1`,
        [videoCompositeUuid]
    );

    if (result.rows.length === 0) return null;
    return mapMetadataRow(result.rows[0]);
};

export const getAllVideoCompositeMetadata = async (): Promise<VideoCompositeMetadata[]> => {
    const result = await pool.query(
        `SELECT * FROM ${VIDEO_COMPOSITES_METADATA_TABLE}`
    );
    return result.rows.map(mapMetadataRow);
};

export const deleteOrphanVideoCompositeMetadata = async (): Promise<number> => {
    const result = await pool.query(`
        DELETE FROM ${VIDEO_COMPOSITES_METADATA_TABLE}
        WHERE composite_video_uuid NOT IN (
            SELECT DISTINCT composite_video_uuid FROM ${VIDEO_COMPOSITES_TABLE}
        )
    `);
    return result.rowCount || 0;
};

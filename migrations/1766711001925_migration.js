/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // 1. Enable pgvector extension
    pgm.createExtension('vector', { ifNotExists: true });

    // 2. Create video_scenes table
    pgm.createTable(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
            source_video_id: {
                type: 'uuid',
                notNull: true,
                references: {
                    schema: 'discovery_showcase',
                    name: 'source_video',
                },
                onDelete: 'CASCADE', // If video is deleted, scenes go too
            },
            start_time: {
                type: 'double precision', // Seconds (e.g. 12.5)
                notNull: true,
            },
            end_time: {
                type: 'double precision',
                notNull: true,
            },
            content: {
                type: 'text',
                notNull: true,
                comment: 'Raw text content of the scene',
            },
            embedding: {
                // Gemini text-embedding-004 uses 768 dimensions
                type: 'vector(768)',
                notNull: true,
            },
            created_at: {
                type: 'timestamp with time zone',
                default: pgm.func('CURRENT_TIMESTAMP'),
                notNull: true,
            },
            updated_at: {
                type: 'timestamp with time zone',
                default: pgm.func('CURRENT_TIMESTAMP'),
                notNull: true,
            },
        }
    );

    // 3. Create standard index for foreign key
    pgm.createIndex(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        'source_video_id'
    );

    // 4. Create HNSW index for vector similarity search
    // Uses cosine distance (vector_cosine_ops)
    pgm.createIndex(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        [
            { name: 'embedding', opclass: 'vector_cosine_ops' }
        ],
        {
            name: 'video_scenes_embedding_idx',
            method: 'hnsw',
        }
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop table first
    pgm.dropTable(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        { ifExists: true }
    );

    // Drop extension (optional, usually safe to leave enabled)
    pgm.dropExtension('vector', { ifExists: true });
};

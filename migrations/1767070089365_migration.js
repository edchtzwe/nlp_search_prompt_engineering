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
    // 1. Create video_clips table
    pgm.createTable(
        { schema: 'discovery_showcase', name: 'video_clips' },
        {
            id: {
                // CHANGE: primary key for video_clips
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
            source_video_id: {
                // CHANGE: non-unique but mandatory foreign key
                type: 'uuid',
                notNull: true,
                references: {
                    schema: 'discovery_showcase',
                    name: 'source_video',
                },
                onDelete: 'CASCADE',
            },
            start_time: {
                // CHANGE: clip start time (required)
                type: 'double precision',
                notNull: true,
            },
            end_time: {
                // CHANGE: clip end time (required)
                type: 'double precision',
                notNull: true,
            },
            // Basic audit fields
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

    // 2. Index for foreign key lookups
    pgm.createIndex(
        { schema: 'discovery_showcase', name: 'video_clips' },
        'source_video_id'
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable(
        { schema: 'discovery_showcase', name: 'video_clips' },
        { ifExists: true }
    );
};

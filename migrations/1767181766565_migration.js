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
    pgm.createTable(
        { schema: 'discovery_showcase', name: 'video_composites' },
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
                onDelete: 'CASCADE',
            },
            composite_video_uuid: {
                type: 'uuid',
                notNull: true,
                comment: 'The ID grouping these source videos together',
            },
            order: {
                type: 'integer',
                notNull: true,
                comment: '1-based index of the video in the composite',
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

    // Index to quickly find all parts of a composite
    pgm.createIndex(
        { schema: 'discovery_showcase', name: 'video_composites' },
        ['composite_video_uuid', 'order']
    );

    // Index to find where a specific source video has been used
    pgm.createIndex(
        { schema: 'discovery_showcase', name: 'video_composites' },
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
        { schema: 'discovery_showcase', name: 'video_composites' },
        { ifExists: true }
    );
};

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

const SCHEMA = 'discovery_showcase';
const TABLE = 'video_mixtures';

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable(
        { schema: SCHEMA, name: TABLE },
        {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
            video_mixture_uuid: {
                // Grouping ID for the mixture
                type: 'uuid',
                notNull: true,
            },
            clip_video_uuid: {
                // FK to video_clips
                type: 'uuid',
                notNull: true,
                references: {
                    schema: SCHEMA,
                    name: 'video_clips',
                },
                onDelete: 'CASCADE',
            },
            name: {
                type: 'text',
                notNull: false,
            },
            order: {
                type: 'integer',
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

    // Index for grouping lookups
    pgm.createIndex(
        { schema: SCHEMA, name: TABLE },
        'video_mixture_uuid'
    );

    // Index for reverse lookups (find all mixtures a clip belongs to)
    pgm.createIndex(
        { schema: SCHEMA, name: TABLE },
        'clip_video_uuid'
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable(
        { schema: SCHEMA, name: TABLE },
        { ifExists: true }
    );
};

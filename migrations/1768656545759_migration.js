/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

const SCHEMA = 'discovery_showcase';
const T_COMPOSITES_META = 'video_composites_metadata';
const T_MIXTURES_META = 'video_mixtures_metadata';

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // --- Rebuild Video Composites Metadata ---

    // 1. Drop the existing table (and data) completely
    pgm.dropTable(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        { ifExists: true, cascade: true }
    );

    // 2. Create fresh with correct PK and columns
    pgm.createTable(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        {
            composite_video_uuid: {
                type: 'uuid',
                primaryKey: true,
                notNull: true,
            },
            name: {
                type: 'text',
            },
            created_at: {
                type: 'timestamp',
                notNull: true,
                default: pgm.func('current_timestamp'),
            },
            updated_at: {
                type: 'timestamp',
                notNull: true,
                default: pgm.func('current_timestamp'),
            },
        }
    );

    // --- Rebuild Video Mixtures Metadata ---

    // 1. Drop the existing table (and data) completely
    pgm.dropTable(
        { schema: SCHEMA, name: T_MIXTURES_META },
        { ifExists: true, cascade: true }
    );

    // 2. Create fresh with correct PK and columns
    pgm.createTable(
        { schema: SCHEMA, name: T_MIXTURES_META },
        {
            video_mixture_uuid: {
                type: 'uuid',
                primaryKey: true,
                notNull: true,
            },
            name: {
                type: 'text',
            },
            created_at: {
                type: 'timestamp',
                notNull: true,
                default: pgm.func('current_timestamp'),
            },
            updated_at: {
                type: 'timestamp',
                notNull: true,
                default: pgm.func('current_timestamp'),
            },
        }
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop the corrected tables
    pgm.dropTable(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        { ifExists: true }
    );

    pgm.dropTable(
        { schema: SCHEMA, name: T_MIXTURES_META },
        { ifExists: true }
    );

    // Note: We do not attempt to restore the "fucked up" schema here 
    // as it was incorrect and data loss was accepted.
};

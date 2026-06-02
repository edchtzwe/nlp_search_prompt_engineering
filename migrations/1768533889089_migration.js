/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

const SCHEMA = 'discovery_showcase';
const T_COMPOSITES = 'video_composites';
const T_MIXTURES = 'video_mixtures';
const T_COMPOSITES_META = 'video_composites_metadata';
const T_MIXTURES_META = 'video_mixtures_metadata';

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // 1. Remove name columns from existing tables
    pgm.dropColumn(
        { schema: SCHEMA, name: T_COMPOSITES },
        'name'
    );
    pgm.dropColumn(
        { schema: SCHEMA, name: T_MIXTURES },
        'name'
    );

    // 2. Create video_composites_metadata table
    pgm.createTable(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
            video_composite_uuid: {
                // FK to video_composites.id
                type: 'uuid',
                notNull: true,
                references: {
                    schema: SCHEMA,
                    name: T_COMPOSITES,
                },
                onDelete: 'CASCADE',
            },
            name: {
                type: 'text',
                notNull: false,
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
    pgm.createIndex(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        'video_composite_uuid'
    );

    // 3. Create video_mixtures_metadata table
    pgm.createTable(
        { schema: SCHEMA, name: T_MIXTURES_META },
        {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
            video_mixture_uuid: {
                // FK to video_mixtures.id
                type: 'uuid',
                notNull: true,
                references: {
                    schema: SCHEMA,
                    name: T_MIXTURES,
                },
                onDelete: 'CASCADE',
            },
            name: {
                type: 'text',
                notNull: false,
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
    pgm.createIndex(
        { schema: SCHEMA, name: T_MIXTURES_META },
        'video_mixture_uuid'
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // 1. Drop metadata tables
    pgm.dropTable(
        { schema: SCHEMA, name: T_MIXTURES_META },
        { ifExists: true }
    );
    pgm.dropTable(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        { ifExists: true }
    );

    // 2. Restore name columns
    pgm.addColumn(
        { schema: SCHEMA, name: T_COMPOSITES },
        {
            name: {
                type: 'text',
                notNull: false,
            },
        }
    );
    pgm.addColumn(
        { schema: SCHEMA, name: T_MIXTURES },
        {
            name: {
                type: 'text',
                notNull: false,
            },
        }
    );
};

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
    // --- Fix Video Composites Metadata ---

    // 1. Drop the redundant index (PK will create a unique one automatically)
    pgm.dropIndex(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        'video_composite_uuid'
    );

    // 2. Drop the old 'id' column. This automatically drops the old PK constraint.
    pgm.dropColumn(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        'id'
    );

    // 3. Set video_composite_uuid as the new Primary Key
    pgm.addConstraint(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        'pk_video_composites_metadata',
        { primaryKey: 'video_composite_uuid' }
    );

    // --- Fix Video Mixtures Metadata ---

    // 1. Drop the redundant index
    pgm.dropIndex(
        { schema: SCHEMA, name: T_MIXTURES_META },
        'video_mixture_uuid'
    );

    // 2. Drop the old 'id' column
    pgm.dropColumn(
        { schema: SCHEMA, name: T_MIXTURES_META },
        'id'
    );

    // 3. Set video_mixture_uuid as the new Primary Key
    pgm.addConstraint(
        { schema: SCHEMA, name: T_MIXTURES_META },
        'pk_video_mixtures_metadata',
        { primaryKey: 'video_mixture_uuid' }
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // --- Revert Composites ---
    pgm.dropConstraint(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        'pk_video_composites_metadata'
    );
    pgm.addColumn(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
        }
    );
    pgm.createIndex(
        { schema: SCHEMA, name: T_COMPOSITES_META },
        'video_composite_uuid'
    );

    // --- Revert Mixtures ---
    pgm.dropConstraint(
        { schema: SCHEMA, name: T_MIXTURES_META },
        'pk_video_mixtures_metadata'
    );
    pgm.addColumn(
        { schema: SCHEMA, name: T_MIXTURES_META },
        {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
        }
    );
    pgm.createIndex(
        { schema: SCHEMA, name: T_MIXTURES_META },
        'video_mixture_uuid'
    );
};

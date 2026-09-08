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
    pgm.addColumn(
        { schema: 'discovery_showcase', name: 'video_clips' },
        {
            name: {
                type: 'text',
                notNull: false,
            },
        }
    );

    pgm.addColumn(
        { schema: 'discovery_showcase', name: 'video_composites' },
        {
            name: {
                type: 'text',
                notNull: false,
            },
        }
    );

    pgm.addColumn(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        {
            name: {
                type: 'text',
                notNull: false,
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
    pgm.dropColumn(
        { schema: 'discovery_showcase', name: 'video_clips' },
        'name'
    );

    pgm.dropColumn(
        { schema: 'discovery_showcase', name: 'video_composites' },
        'name'
    );

    pgm.dropColumn(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        'name'
    );
};

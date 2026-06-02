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
    pgm.addColumns(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        {
            ai_provider: {
                type: 'varchar(50)',
                notNull: true,
                default: 'google', // Default for existing rows
            },
            ai_model: {
                type: 'varchar(100)',
                notNull: true,
                default: 'text-embedding-004', // Default for existing rows
            },
        }
    );

    // Optional: Remove the defaults if you want to force explicit values for future inserts
    pgm.alterColumn(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        'ai_provider',
        { default: null }
    );
    pgm.alterColumn(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        'ai_model',
        { default: null }
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropColumns(
        { schema: 'discovery_showcase', name: 'video_scenes' },
        ['ai_provider', 'ai_model']
    );
};


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
    // Create schema
    pgm.createSchema('discovery_showcase', { ifNotExists: true });

    // Create source_video table
    pgm.createTable(
        { schema: 'discovery_showcase', name: 'source_video' },
        {
            id: {
                type: 'uuid',
                primaryKey: true,
                default: pgm.func('gen_random_uuid()'),
            },
            original_name: {
                type: 'varchar(255)',
                notNull: true,
            },
            mime_type: {
                type: 'varchar(100)',
                notNull: true,
            },
            size: {
                type: 'bigint',
                notNull: true,
            },
            filename: {
                type: 'varchar(255)',
                notNull: true,
                unique: true,
            },
            path: {
                type: 'text',
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

    // Create indexes
    pgm.createIndex(
        { schema: 'discovery_showcase', name: 'source_video' },
        'created_at'
    );

    pgm.createIndex(
        { schema: 'discovery_showcase', name: 'source_video' },
        'filename'
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable(
        { schema: 'discovery_showcase', name: 'source_video' },
        { ifExists: true }
    );

    pgm.dropSchema('discovery_showcase', { ifExists: true });
};
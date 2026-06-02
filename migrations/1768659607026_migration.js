/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

const SCHEMA = 'discovery_showcase';
const TABLE = 'source_video';

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.addColumns(
        { schema: SCHEMA, name: TABLE },
        {
            name: {
                type: 'text',
                notNull: false, // Optional, allows existing records to be null
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
    pgm.dropColumns(
        { schema: SCHEMA, name: TABLE },
        ['name']
    );
};

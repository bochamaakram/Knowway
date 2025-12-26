/**
 * PostgreSQL Query Helper
 * Wraps pg queries to return data in a format compatible with mysql2 syntax
 */
const pool = require('./database');

const query = async (sql, params = []) => {
    // Convert MySQL ? placeholders to PostgreSQL $1, $2, etc
    let paramIndex = 0;
    let pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);

    // Handle INSERT ... VALUES to add RETURNING id for compatibility
    if (pgSql.match(/INSERT INTO/i) && !pgSql.match(/RETURNING/i)) {
        pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
    }

    // Handle INSERT IGNORE (MySQL) - convert to ON CONFLICT DO NOTHING (PostgreSQL)
    pgSql = pgSql.replace(/INSERT IGNORE INTO/gi, 'INSERT INTO');
    if (pgSql.match(/INSERT INTO/i) && sql.match(/IGNORE/i)) {
        pgSql = pgSql.replace(/RETURNING id\s*$/, 'ON CONFLICT DO NOTHING RETURNING id');
    }

    const result = await pool.query(pgSql, params);

    // For INSERT, create a mock insertId from RETURNING
    if (result.rows && result.rows.length > 0 && result.rows[0].id) {
        result.insertId = result.rows[0].id;
    }

    return [result.rows, result];
};

const getConnection = async () => {
    const client = await pool.connect();
    return {
        query: async (sql, params = []) => {
            let paramIndex = 0;
            let pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);

            if (pgSql.match(/INSERT INTO/i) && !pgSql.match(/RETURNING/i)) {
                pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
            }

            pgSql = pgSql.replace(/INSERT IGNORE INTO/gi, 'INSERT INTO');
            if (pgSql.match(/INSERT INTO/i) && sql.match(/IGNORE/i)) {
                pgSql = pgSql.replace(/RETURNING id\s*$/, 'ON CONFLICT DO NOTHING RETURNING id');
            }

            const result = await client.query(pgSql, params);

            if (result.rows && result.rows.length > 0 && result.rows[0].id) {
                result.insertId = result.rows[0].id;
            }

            return [result.rows, result];
        },
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK'),
        release: () => client.release()
    };
};

module.exports = { query, getConnection };

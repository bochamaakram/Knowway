const { Pool } = require('pg');

// Support both DATABASE_URL (Supabase/Vercel) and individual env vars (local dev)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Test connection
pool.connect()
    .then(client => {
        console.log('✅ Database connected successfully');
        client.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

module.exports = pool;

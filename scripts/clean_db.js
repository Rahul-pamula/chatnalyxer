const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:password@localhost:5432/chatnalyxer'
});

async function cleanDB() {
    try {
        const res = await pool.query("DELETE FROM messages WHERE priority_level = 'LOW'");
        console.log(`✅ Cleaned up ${res.rowCount} LOW priority messages.`);
    } catch (e) {
        console.error("❌ Error cleaning DB:", e);
    } finally {
        await pool.end();
    }
}

cleanDB();

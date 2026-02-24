
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path to .env if needed

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'risk_management',
};

async function renumberRisks() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // Fetch all risks ordered by creation time
        const [risks] = await connection.query('SELECT id, created_at, risk_id FROM risks ORDER BY created_at ASC, id ASC');
        console.log(`Found ${risks.length} risks to renumber.`);

        if (risks.length === 0) {
            console.log('No risks found.');
            return;
        }

        let counter = 1;
        for (const risk of risks) {
            // Pad with 3 zeros
            const newId = String(counter).padStart(3, '0');

            console.log(`Updating Risk ${risk.id}: ${risk.risk_id} -> ${newId}`);

            await connection.query('UPDATE risks SET risk_id = ? WHERE id = ?', [newId, risk.id]);
            counter++;
        }

        console.log('Renumbering complete.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

renumberRisks();

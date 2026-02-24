const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'risk_management'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');

        // Add sl_no column if it doesn't exist
        const [columns] = await connection.query('SHOW COLUMNS FROM risks LIKE "sl_no"');
        if (columns.length === 0) {
            console.log('Adding sl_no column...');
            await connection.query('ALTER TABLE risks ADD COLUMN sl_no INT AFTER risk_id');

            // Update existing sl_no based on department_id
            console.log('Updating existing sl_no values...');
            const [departments] = await connection.query('SELECT id FROM departments');
            for (const dept of departments) {
                const [risks] = await connection.query(
                    'SELECT id FROM risks WHERE department_id = ? ORDER BY created_at',
                    [dept.id]
                );
                for (let i = 0; i < risks.length; i++) {
                    await connection.query('UPDATE risks SET sl_no = ? WHERE id = ?', [i + 1, risks[i].id]);
                }
            }

            // Add NOT NULL constraint
            await connection.query('ALTER TABLE risks MODIFY COLUMN sl_no INT NOT NULL');

            // Add unique constraint
            console.log('Adding unique constraint (department_id, sl_no)...');
            await connection.query('ALTER TABLE risks ADD UNIQUE (department_id, sl_no)');

            console.log('Migration completed successfully');
        } else {
            console.log('sl_no column already exists');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'risk_management.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking documents table...');
db.serialize(() => {
    db.all("PRAGMA table_info(documents)", (err, rows) => {
        if (err) {
            console.error('Error checking documents table:', err.message);
            return;
        }
        console.log('Columns in documents table:');
        rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });

        db.all("SELECT id, name FROM departments", (err, rows) => {
            if (err) {
                console.error('Error fetching departments:', err.message);
                return;
            }
            console.log('\nDepartments in database:');
            rows.forEach(row => {
                console.log(`- ID: ${row.id}, Name: ${row.name}`);
            });
            db.close();
        });
    });
});

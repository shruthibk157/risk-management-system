const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'risk_management.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Checking database schema...');
    db.all("PRAGMA table_info(risks)", (err, rows) => {
        if (err) {
            console.error('Error fetching table info:', err);
            return;
        }
        console.log('Columns in risks table:');
        rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });

        const slNoExists = rows.some(row => row.name === 'sl_no');
        if (slNoExists) {
            console.log('\n✅ sl_no column exists.');
        } else {
            console.log('\n❌ sl_no column MISSING.');
        }

        db.get("SELECT COUNT(*) as count FROM risks", (err, row) => {
            console.log(`\nTotal risks: ${row.count}`);
            db.close();
        });
    });
});

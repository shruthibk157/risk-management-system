
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../risk_management.db');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to SQLite database at:', dbPath);

db.serialize(() => {
    // Get all risks ordered by creation time (primary key id usually suffices)
    db.all("SELECT id, risk_id FROM risks ORDER BY id ASC", (err, rows) => {
        if (err) {
            console.error('Failed to fetch risks:', err);
            return;
        }

        console.log(`Found ${rows.length} risks to renumber.`);

        // Start renumbering
        let counter = 1;
        const updates = rows.map(row => {
            const newId = String(counter++).padStart(3, '0'); // 001, 002...
            return new Promise((resolve, reject) => {
                db.run("UPDATE risks SET risk_id = ? WHERE id = ?", [newId, row.id], function (err) {
                    if (err) {
                        console.error(`Failed to update Risk ID ${row.id}:`, err);
                        reject(err);
                    } else {
                        console.log(`Updated Risk ${row.id}: ${row.risk_id} -> ${newId}`);
                        resolve();
                    }
                });
            });
        });

        Promise.all(updates).then(() => {
            console.log('Migration complete.');
            db.close();
        }).catch(err => {
            console.error('Migration encountered errors:', err);
            db.close();
        });
    });
});

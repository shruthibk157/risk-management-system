
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../risk_management.db');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to SQLite database at:', dbPath);

db.serialize(() => {
    // Get all risks
    db.all("SELECT id, risk_id FROM risks", (err, rows) => {
        if (err) {
            console.error('Failed to fetch risks:', err);
            return;
        }

        console.log(`Found ${rows.length} risks to check for padding.`);

        const updates = rows.map(row => {
            // Convert to integer and back to string to remove leading zeros (e.g. "001" -> 1 -> "1")
            const currentId = row.risk_id;
            const newId = String(parseInt(currentId, 10));

            if (currentId !== newId && !isNaN(newId)) {
                return new Promise((resolve, reject) => {
                    db.run("UPDATE risks SET risk_id = ? WHERE id = ?", [newId, row.id], function (err) {
                        if (err) {
                            console.error(`Failed to update Risk ID ${row.id}:`, err);
                            reject(err);
                        } else {
                            console.log(`Updated Risk ${row.id}: ${currentId} -> ${newId}`);
                            resolve();
                        }
                    });
                });
            } else {
                return Promise.resolve();
            }
        });

        Promise.all(updates).then(() => {
            console.log('Migration complete. All IDs are now simple integers.');
            db.close();
        }).catch(err => {
            console.error('Migration encountered errors:', err);
            db.close();
        });
    });
});

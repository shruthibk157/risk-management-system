const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'risk_management.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Check typical IT user
    db.get("SELECT * FROM users WHERE username LIKE 'it_user%'", (err, row) => {
        if (row) {
            console.log('Current IT User:', row);
            if (row.department_id !== 1) {
                console.log('Fixing IT User department_id to 1...');
                db.run("UPDATE users SET department_id = 1 WHERE id = ?", [row.id], (err) => {
                    if (!err) console.log('Update successful.');
                    else console.error('Update failed:', err);
                });
            } else {
                console.log('IT User already correct.');
            }
        } else {
            console.log('IT User not found.');
        }
    });
});

setTimeout(() => { db.close(); }, 2000);

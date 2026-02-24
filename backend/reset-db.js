const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('risk_management.db');

db.serialize(() => {
    db.run("DELETE FROM risks");
    db.run("DELETE FROM actions");
    db.run("DELETE FROM risk_reviews");
    // Optional: Reset auto-increment if needed, though sl_no is handled manually by MAX()
    db.run("DELETE FROM sqlite_sequence WHERE name='risks'");
    console.log('Risks table cleared and sequence reset.');
});

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../risk_management.db');
const db = new sqlite3.Database(dbPath);

db.all('SELECT r.id, r.sl_no, r.department_id, d.name as dept_name, r.risk_description FROM risks r JOIN departments d ON r.department_id = d.id ORDER BY r.department_id, r.sl_no', [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});

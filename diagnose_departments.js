const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'risk_management.db');
const db = new sqlite3.Database(dbPath);

console.log('--- DIAGNOSTIC START ---');

db.serialize(() => {
    db.all('SELECT id, name FROM departments ORDER BY id', (err, rows) => {
        if (err) {
            console.error('Dept Error:', err);
        } else {
            console.log('DEPARTMENTS:');
            rows.forEach(r => console.log(`[${r.id}] ${r.name}`));
        }
    });

    db.all("SELECT id, username, department_id, role FROM users WHERE username LIKE '%it%' OR username LIKE '%user%'", (err, rows) => {
        if (err) {
            console.error('User Error:', err);
        } else {
            console.log('USERS (Filtered):');
            rows.forEach(r => console.log(`User: ${r.username} | Role: ${r.role} | DeptID: ${r.department_id}`));
        }
    });
});

setTimeout(() => {
    db.close();
}, 2000);

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend/risk_management.db');
const db = new sqlite3.Database(dbPath);

const createTestUsers = async () => {
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
        { username: 'finance_user', email: 'finance@example.com', role: 'user', dept: 'Finance' },
        { username: 'it_user', email: 'it@example.com', role: 'user', dept: 'IT' }
    ];

    users.forEach(user => {
        db.get('SELECT id FROM departments WHERE name = ?', [user.dept], (err, dept) => {
            if (err) return console.error(err);
            if (!dept) return console.error(`Department ${user.dept} not found`);

            db.run(`INSERT OR IGNORE INTO users (username, password_hash, email, full_name, role, department_id, is_active) 
              VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [user.username, passwordHash, user.email, `${user.dept} User`, user.role, dept.id],
                function (err) {
                    if (err) console.error(err.message);
                    else console.log(`Created user: ${user.username} (Dept: ${user.dept})`);
                }
            );
        });
    });
};

createTestUsers();

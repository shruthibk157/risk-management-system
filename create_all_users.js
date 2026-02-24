const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend/risk_management.db');
const db = new sqlite3.Database(dbPath);

const createAllDepartmentUsers = async () => {
    const passwordHash = await bcrypt.hash('password123', 10);

    db.all('SELECT id, name FROM departments', [], (err, departments) => {
        if (err) return console.error(err);

        departments.forEach(dept => {
            // Cleaner username generation: "hr_user", "quality_user"
            const username = `${dept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_user`;
            const email = `${username}@example.com`;

            db.run(`INSERT OR IGNORE INTO users (username, password_hash, email, full_name, role, department_id, is_active) 
              VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [username, passwordHash, email, `${dept.name} Test User`, 'user', dept.id],
                function (err) {
                    if (err) console.error(`Error creating ${username}:`, err.message);
                    else console.log(`Verified/Created user: ${username} (Password: password123) for ${dept.name}`);
                }
            );
        });
    });
};

createAllDepartmentUsers();

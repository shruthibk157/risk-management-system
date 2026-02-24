const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'backend', 'risk_management.db');
const db = new sqlite3.Database(dbPath);
const PORT = 5001; // BackEnd port

async function run() {
    // 1. Create Debug User
    const password = 'debugpassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await new Promise((resolve, reject) => {
        db.run(`INSERT OR REPLACE INTO users (username, password_hash, full_name, role, department_id) VALUES (?, ?, ?, ?, ?)`,
            ['debug_user', hashedPassword, 'Debug User', 'department_user', 1], // ID 1 = IT
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
    console.log('Debug User Created/Updated (Dept ID: 1)');

    try {
        // 2. Login
        const loginRes = await axios.post(`http://localhost:${PORT}/api/auth/login`, {
            username: 'debug_user',
            password: password
        });
        const token = loginRes.data.token;
        console.log('Login Successful. Token User:', loginRes.data.user);

        // 3. Fetch Departments
        const deptRes = await axios.get(`http://localhost:${PORT}/api/dashboard/departments`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('API Response (Departments):');
        console.log(JSON.stringify(deptRes.data, null, 2));

        // Check if ID 1 is present
        const itDept = deptRes.data.find(d => d.id == 1);
        if (itDept) console.log('SUCCESS: Found IT department (ID 1)');
        else console.error('FAILURE: IT department (ID 1) NOT found in response');

    } catch (error) {
        console.error('API Error:', error.response ? error.response.data : error.message);
    } finally {
        db.close();
    }
}

run();

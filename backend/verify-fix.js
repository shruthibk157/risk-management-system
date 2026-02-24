const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const sqlite3 = require('sqlite3').verbose();

async function verifyUpload() {
    const API_URL = 'http://localhost:5001/api';
    const TEST_FILE = 'test_doc.txt';
    const dbPath = path.join(__dirname, 'risk_management.db');

    // Create a dummy file
    fs.writeFileSync(TEST_FILE, 'This is a test document for verification.');

    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('✓ Logged in successfully.');

        console.log('2. Uploading document...');
        const form = new FormData();
        form.append('files', fs.createReadStream(TEST_FILE));
        form.append('department_id', '1'); // IT department ID

        const uploadRes = await axios.post(`${API_URL}/documents/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('✓ Upload successful:', uploadRes.data.message);

        console.log('3. Verifying in database...');
        const db = new sqlite3.Database(dbPath);
        const rows = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM documents WHERE filename = ? ORDER BY uploaded_at DESC LIMIT 1', [TEST_FILE], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (rows.length > 0) {
            console.log('✓ Verification Success: Document found in database!');
            console.log('  Details:', JSON.stringify(rows[0], null, 2));
        } else {
            console.error('✗ Verification Failed: Document not found in database.');
        }
        db.close();

    } catch (error) {
        console.error('✗ Verification Failed:', error.response?.data || error.message);
    } finally {
        if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    }
}

verifyUpload();

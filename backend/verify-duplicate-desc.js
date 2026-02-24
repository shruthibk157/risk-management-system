const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function verify() {
    try {
        console.log('--- Logging in ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const testDesc = 'Duplicate Risk Description Test ' + Date.now();

        console.log('--- Creating First Risk ---');
        await axios.post(`${API_URL}/risks`, {
            department_id: 1,
            risk_description: testDesc,
            severity: 3,
            occurrence: 2,
            detection: 1,
            requirement_process_area: 'Verification 1'
        }, config);
        console.log('✅ First risk created successfully');

        console.log('--- Creating Second Risk with SAME description ---');
        const secondRes = await axios.post(`${API_URL}/risks`, {
            department_id: 1,
            risk_description: testDesc,
            severity: 4,
            occurrence: 3,
            detection: 2,
            requirement_process_area: 'Verification 2'
        }, config);

        console.log('✅ Second risk created successfully! ID:', secondRes.data.id);
        console.log('🎉 SUCCESS: UNIQUE constraint no longer block duplicate descriptions.');

    } catch (error) {
        console.error('❌ Verification failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

verify();

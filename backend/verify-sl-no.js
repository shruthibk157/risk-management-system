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

        console.log('--- Checking Global next_sl_no ---');
        const nextRes = await axios.get(`${API_URL}/risks/next-sl-no`, config);
        console.log('Global next_sl_no:', nextRes.data.next_sl_no);
        const startSlNo = nextRes.data.next_sl_no;

        console.log('--- Creating a new risk for IT (Dept 2) ---');
        const risk1 = await axios.post(`${API_URL}/risks`, {
            department_id: 2,
            risk_description: 'Test Global Risk 1',
            severity: 3,
            occurrence: 2,
            detection: 1,
            requirement_process_area: 'Verification',
            sl_no: null // Mimic frontend sending null or 'Auto' which backend ignores/sanitizes
        }, config);
        console.log('Created Risk 1 sl_no:', risk1.data.sl_no);

        console.log('--- Creating a new risk for Finance (Dept 3) ---');
        const risk2 = await axios.post(`${API_URL}/risks`, {
            department_id: 3,
            risk_description: 'Test Global Risk 2',
            severity: 3,
            occurrence: 2,
            detection: 1,
            requirement_process_area: 'Verification'
        }, config);
        console.log('Created Risk 2 sl_no:', risk2.data.sl_no);

        if (risk2.data.sl_no === risk1.data.sl_no + 1) {
            console.log('SUCCESS: SL No incremented globally correctly.');
        } else {
            console.error('FAILURE: SL No did not increment correctly.');
        }

    } catch (error) {
        console.error('Verification failed:', error.response?.data || error.message);
    }
}

verify();

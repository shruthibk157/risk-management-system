const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function testAuthenticated() {
    try {
        console.log('1. Logging in as admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('2. Testing Magic Prompt endpoint (/api/ai/generate-risk)...');
        // Sending a department ID that likely doesn't have documents (or does, depending on seed)
        // Admin user (id 1) logic requires document.uploaded_by?

        try {
            await axios.post(`${API_URL}/ai/generate-risk`, { department_id: 123 }, { headers });
        } catch (error) {
            if (error.response) {
                console.log('Response Status:', error.response.status);
                console.log('Response Data:', error.response.data);
                if (error.response.status === 404 && error.response.data.error.includes('Please upload')) {
                    console.log('✅ Correctly handled "No documents" scenario for department 123');
                } else if (error.response.status === 404 && error.response.data.error.includes('Department not found')) {
                    console.log('✅ Correctly handled "Department not found"');
                }
            } else {
                console.error('Network Error:', error.message);
            }
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Main Error Data:', error.response.data);
        }
    }
}

testAuthenticated();

const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function testConnection() {
    try {
        console.log('Testing Test AI Route (/api/test-ai)...');
        try {
            const testAi = await axios.get(`${API_URL}/test-ai`);
            console.log('Test AI Route Status:', testAi.status, testAi.data);
        } catch (e) {
            console.error('Test AI Route Failed:', e.message, e.response ? e.response.status : '');
        }

        console.log('Testing AI Route (/api/ai/generate-risk)...');
        // Sending valid department_id (but likely no docs) to trigger logic
        const aiResponse = await axios.post(`${API_URL}/ai/generate-risk`, { department_id: 123 });
        console.log('AI Route Response:', aiResponse.status, aiResponse.data);
    } catch (error) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', error.response.data);
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

testConnection();

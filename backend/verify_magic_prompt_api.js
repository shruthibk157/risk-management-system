const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'http://localhost:5001/api';
// We need to authenticate to upload a document to a department
// Or we can manually insert a document into the DB if we want to bypass auth for this test,
// but using the API is better integration testing.
// However, I don't have a login token here easily without logging in.

// Let's rely on the fact that I just implemented the endpoint and I can mock the DB interaction 
// OR I can just try to hit the endpoint and see if it fails with "Department ID required" or "No documents".
// This confirms the route is reachable.

async function testMagicPrompt() {
    try {
        console.log('Testing Magic Prompt API...');

        // 1. Test without Department ID
        try {
            await axios.post(`${API_URL}/ai/generate-risk`, {});
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Correctly rejected missing department ID');
            } else {
                console.error('❌ Unexpected error for missing ID:', error.message);
            }
        }

        // 2. Test with Department ID but no documents (assuming Dept 9999 has no docs)
        try {
            await axios.post(`${API_URL}/ai/generate-risk`, { department_id: 9999 });
        } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data.error.includes('upload department documents')) {
                console.log('✅ Correctly rejected department with no documents');
            } else {
                console.error('❌ Unexpected error for empty department:', error.response ? error.response.data : error.message);
            }
        }

        // 3. Test Articulate Risk (Rephrase) - verification of the other endpoint I added
        const rephraseResponse = await axios.post(`${API_URL}/ai/articulate-risk`, {
            context_text: "[REPHRASE_MODE] fix this bad text"
        });

        if (rephraseResponse.data.rephrased && rephraseResponse.data.rephrased.includes('Professional Standard')) {
            console.log('✅ Articulate Risk (Rephrase) working');
        } else {
            console.error('❌ Articulate Risk failed:', rephraseResponse.data);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

testMagicPrompt();

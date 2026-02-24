// Test script to verify risk creation and retrieval
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testRiskCreation() {
  try {
    console.log('🔍 Testing Risk Creation Flow...\n');

    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received\n');

    // 2. Create a test risk
    console.log('2. Creating test risk...');
    const testRisk = {
      department_id: 1,
      process_function: 'Test Process',
      risk_description: 'Test risk for verification',
      potential_failure_mode: 'Test failure',
      potential_effects: 'Test effects',
      severity: 5,
      potential_causes: 'Test causes',
      current_controls_prevention: 'Test prevention',
      occurrence: 4,
      current_controls_detection: 'Test detection',
      detection: 3,
      recommended_actions: 'Test actions'
    };

    const createResponse = await axios.post(`${BASE_URL}/risks`, testRisk, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Risk created:', createResponse.data);
    const createdRiskId = createResponse.data.id;

    // 3. Fetch all risks to verify it appears
    console.log('\n3. Fetching all risks...');
    const getResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const risks = getResponse.data;
    console.log(`✅ Retrieved ${risks.length} risks`);

    // Check if our created risk is in the list
    const ourRisk = risks.find(r => r.id === createdRiskId);
    if (ourRisk) {
      console.log('✅ Created risk found in list:', {
        id: ourRisk.id,
        risk_id: ourRisk.risk_id,
        description: ourRisk.risk_description,
        rpn: ourRisk.rpn,
        department_name: ourRisk.department_name
      });
    } else {
      console.log('❌ Created risk NOT found in the list!');
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testRiskCreation();
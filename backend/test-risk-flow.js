// Simple test to verify risk creation and retrieval
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testRiskFlow() {
  try {
    console.log('🔍 Testing Risk Creation & Retrieval Flow...\n');

    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Get initial risk count
    console.log('2. Getting initial risk count...');
    const initialResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const initialCount = initialResponse.data.length;
    console.log(`✅ Initial risks: ${initialCount}\n`);

    // 3. Create a new risk
    console.log('3. Creating new risk...');
    const newRisk = {
      department_id: 1,
      process_function: 'New Test Process',
      risk_description: 'New test risk for immediate sync verification',
      potential_failure_mode: 'New test failure mode',
      potential_effects: 'New test effects',
      severity: 7,
      potential_causes: 'New test causes',
      current_controls_prevention: 'New prevention controls',
      occurrence: 5,
      current_controls_detection: 'New detection controls',
      detection: 4,
      recommended_actions: 'New recommended actions'
    };

    const createResponse = await axios.post(`${BASE_URL}/risks`, newRisk, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Risk created:', createResponse.data);
    const newRiskId = createResponse.data.id;

    // 4. Verify it appears in the list immediately
    console.log('\n4. Verifying risk appears in GET /risks...');
    const updatedResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const updatedCount = updatedResponse.data.length;
    const foundRisk = updatedResponse.data.find(r => r.id === newRiskId);

    console.log(`✅ Updated risk count: ${updatedCount} (was ${initialCount})`);
    if (foundRisk) {
      console.log('✅ New risk found in list:', {
        id: foundRisk.id,
        risk_id: foundRisk.risk_id,
        description: foundRisk.risk_description,
        rpn: foundRisk.rpn,
        department_name: foundRisk.department_name
      });
    } else {
      console.log('❌ New risk NOT found in the list!');
      return;
    }

    console.log('\n🎉 Risk creation and retrieval flow working perfectly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testRiskFlow();
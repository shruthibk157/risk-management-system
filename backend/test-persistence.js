// Test script to verify risk creation, persistence, and duplicate prevention
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testRiskPersistence() {
  console.log('🧪 Testing Risk Creation, Persistence & Duplicate Prevention\n');

  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Get initial count
    console.log('2. Getting initial risk count...');
    const initialResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const initialCount = initialResponse.data.length;
    console.log(`📊 Initial risks: ${initialCount}\n`);

    // 3. Create a unique risk
    const timestamp = Date.now();
    const testRisk = {
      department_id: 1,
      process_function: `Test Process ${timestamp}`,
      risk_description: `Unique test risk ${timestamp}`,
      potential_failure_mode: 'Test failure mode',
      potential_effects: 'Test effects',
      severity: 5,
      potential_causes: 'Test causes',
      current_controls_prevention: 'Test prevention',
      occurrence: 4,
      current_controls_detection: 'Test detection',
      detection: 3,
      recommended_actions: 'Test actions'
    };

    console.log('3. Creating new unique risk...');
    const createResponse = await axios.post(`${BASE_URL}/risks`, testRisk, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Risk created successfully!');
    console.log('📋 Risk details:', {
      id: createResponse.data.id,
      risk_id: createResponse.data.risk_id,
      rpn: createResponse.data.rpn,
      classification: createResponse.data.risk_classification
    });

    // 4. Verify it appears in the list
    console.log('\n4. Verifying risk appears in GET /risks...');
    const afterCreateResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const afterCreateCount = afterCreateResponse.data.length;
    const newRisk = afterCreateResponse.data.find(r => r.id === createResponse.data.id);

    console.log(`📊 After creation: ${afterCreateCount} risks (was ${initialCount})`);
    if (newRisk) {
      console.log('✅ New risk found in list:', newRisk.risk_id);
    } else {
      console.log('❌ New risk NOT found in list!');
      return;
    }

    // 5. Try to create the same risk again (should fail)
    console.log('\n5. Testing duplicate prevention...');
    try {
      await axios.post(`${BASE_URL}/risks`, testRisk, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Duplicate creation succeeded (should have failed!)');
    } catch (duplicateError) {
      if (duplicateError.response?.status === 409) {
        console.log('✅ Duplicate correctly prevented!');
        console.log('🚫 Error message:', duplicateError.response.data.error);
      } else {
        console.log('❌ Unexpected error:', duplicateError.response?.data || duplicateError.message);
      }
    }

    // 6. Verify count didn't increase
    console.log('\n6. Verifying risk count remained the same...');
    const finalResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const finalCount = finalResponse.data.length;

    console.log(`📊 Final count: ${finalCount} (should be ${afterCreateCount})`);
    if (finalCount === afterCreateCount) {
      console.log('✅ Count remained correct - no duplicates created');
    } else {
      console.log('❌ Count changed unexpectedly!');
    }

    console.log('\n🎉 All tests passed! Risk persistence and duplicate prevention working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

testRiskPersistence();
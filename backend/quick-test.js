#!/usr/bin/env node

// Quick API Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function quickTest() {
  console.log('🔍 Quick Risk System API Test\n');

  try {
    // 1. Test login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Get current risk count
    console.log('2. Getting current risk count...');
    const getResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const initialCount = getResponse.data.length;
    console.log(`📊 Current risks: ${initialCount}\n`);

    // 3. Create a test risk
    console.log('3. Creating test risk...');
    const testRisk = {
      department_id: 1,
      risk_description: 'Quick API test risk',
      severity: 5,
      occurrence: 4,
      detection: 3
    };

    const createResponse = await axios.post(`${BASE_URL}/risks`, testRisk, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Risk created:', createResponse.data.risk_id);

    // 4. Verify it appears
    console.log('\n4. Verifying risk appears in list...');
    const verifyResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const newCount = verifyResponse.data.length;
    const found = verifyResponse.data.find(r => r.id === createResponse.data.id);

    console.log(`📊 New risk count: ${newCount} (was ${initialCount})`);
    console.log(found ? '✅ Risk found in list!' : '❌ Risk NOT found in list!');

    console.log('\n🎉 API test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
    console.log('\n💡 Possible issues:');
    console.log('- Backend server not running (start with: pnpm run dev)');
    console.log('- Wrong API URL or port');
    console.log('- Database connection issues');
  }
}

quickTest();
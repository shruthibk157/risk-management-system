// Test script to verify department validation and risk creation
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testDepartmentValidation() {
  console.log('🧪 Testing Department Validation & Risk Creation\n');

  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // 2. Get valid departments
    console.log('2. Getting valid departments...');
    const deptResponse = await axios.get(`${BASE_URL}/dashboard/departments`);
    const departments = deptResponse.data;
    console.log('✅ Available departments:', departments.map(d => `${d.id}: ${d.name}`));
    console.log('');

    // 3. Test invalid department ID
    console.log('3. Testing invalid department ID...');
    try {
      const invalidRisk = {
        department_id: 999, // Invalid department
        risk_description: 'Test with invalid department',
        severity: 5,
        occurrence: 4,
        detection: 3
      };

      await axios.post(`${BASE_URL}/risks`, invalidRisk, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Invalid department was accepted (should have failed!)');
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.error.includes('Invalid department')) {
        console.log('✅ Invalid department correctly rejected:', error.response.data.error);
      } else {
        console.log('❌ Unexpected error for invalid department:', error.response?.data || error.message);
      }
    }
    console.log('');

    // 4. Test valid department but duplicate risk
    if (departments.length > 0) {
      console.log('4. Testing duplicate risk in valid department...');
      const validDept = departments[0];

      const duplicateRisk = {
        department_id: validDept.id,
        risk_description: 'Test duplicate risk',
        severity: 5,
        occurrence: 4,
        detection: 3
      };

      // Create first risk
      try {
        const firstResponse = await axios.post(`${BASE_URL}/risks`, duplicateRisk, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ First risk created:', firstResponse.data.risk_id);
      } catch (error) {
        console.log('❌ First risk creation failed:', error.response?.data?.error || error.message);
        return;
      }

      // Try to create duplicate
      try {
        await axios.post(`${BASE_URL}/risks`, duplicateRisk, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('❌ Duplicate risk was accepted (should have failed!)');
      } catch (error) {
        if (error.response?.status === 409) {
          console.log('✅ Duplicate risk correctly rejected:', error.response.data.error);
        } else {
          console.log('❌ Unexpected error for duplicate:', error.response?.data || error.message);
        }
      }
      console.log('');
    }

    // 5. Test valid risk creation
    console.log('5. Testing valid risk creation...');
    if (departments.length > 0) {
      const validDept = departments[0];
      const timestamp = Date.now();

      const validRisk = {
        department_id: validDept.id,
        risk_description: `Valid test risk ${timestamp}`,
        severity: 5,
        occurrence: 4,
        detection: 3
      };

      try {
        const response = await axios.post(`${BASE_URL}/risks`, validRisk, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Valid risk created successfully!');
        console.log('📋 Risk details:', {
          id: response.data.id,
          risk_id: response.data.risk_id,
          department_id: response.data.department_id,
          rpn: response.data.rpn,
          classification: response.data.risk_classification
        });
      } catch (error) {
        console.log('❌ Valid risk creation failed:', error.response?.data?.error || error.message);
        return;
      }
    }

    // 6. Verify risk appears in GET request
    console.log('\n6. Verifying risk appears in GET /api/risks...');
    const getResponse = await axios.get(`${BASE_URL}/risks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const risks = getResponse.data;
    console.log(`✅ Retrieved ${risks.length} risks from GET endpoint`);

    // Check that all risks have valid departments
    const invalidRisks = risks.filter(risk => !departments.find(d => d.id === risk.department_id));
    if (invalidRisks.length > 0) {
      console.log('❌ Found risks with invalid department IDs:', invalidRisks.map(r => r.risk_id));
    } else {
      console.log('✅ All risks have valid department associations');
    }

    console.log('\n🎉 All department validation tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.error || error.message);
  }
}

testDepartmentValidation();
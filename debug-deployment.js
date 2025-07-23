const axios = require('axios');

const BASE_URL = 'https://sec-x-backend.onrender.com';

async function debugDeployment() {
  console.log('🔍 Debugging Render deployment...\n');

  try {
    // Test 1: Basic connectivity
    console.log('1. Testing basic connectivity...');
    try {
      const response = await axios.get(`${BASE_URL}/api/health`, {
        timeout: 10000
      });
      console.log('✅ Server is responding:', response.data);
    } catch (error) {
      console.log('❌ Server not responding:', error.message);
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 The server might not be running or the URL is incorrect');
      }
      return;
    }

    // Test 2: CORS preflight
    console.log('\n2. Testing CORS preflight...');
    try {
      const corsResponse = await axios.options(`${BASE_URL}/api/auth/login`, {
        headers: {
          'Origin': 'https://sec-x.netlify.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        timeout: 10000
      });
      console.log('✅ CORS preflight successful:', corsResponse.headers);
    } catch (error) {
      console.log('❌ CORS preflight failed:', error.response?.status, error.response?.data);
    }

    // Test 3: Login endpoint
    console.log('\n3. Testing login endpoint...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://sec-x.netlify.app'
        },
        timeout: 10000
      });
      console.log('✅ Login endpoint working:', loginResponse.data);
    } catch (error) {
      console.log('❌ Login endpoint error:', error.response?.status, error.response?.data);
      if (error.response?.status === 404) {
        console.log('💡 The endpoint might not be deployed correctly');
      }
    }

    // Test 4: Register endpoint
    console.log('\n4. Testing register endpoint...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: 'Debug User',
        email: `debug-${Date.now()}@example.com`,
        password: 'password123'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://sec-x.netlify.app'
        },
        timeout: 10000
      });
      console.log('✅ Register endpoint working:', registerResponse.data);
    } catch (error) {
      console.log('❌ Register endpoint error:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugDeployment(); 
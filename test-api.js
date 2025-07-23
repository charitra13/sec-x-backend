const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health endpoint working:', healthResponse.data);

    // Test register endpoint
    console.log('\n2. Testing register endpoint...');
    const registerData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
      console.log('✅ Register endpoint working:', registerResponse.data);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Register endpoint working (user already exists)');
      } else {
        console.log('❌ Register endpoint error:', error.response?.data || error.message);
      }
    }

    // Test login endpoint
    console.log('\n3. Testing login endpoint...');
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, loginData);
      console.log('✅ Login endpoint working:', loginResponse.data);
    } catch (error) {
      console.log('❌ Login endpoint error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI(); 
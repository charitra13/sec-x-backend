const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testConnection() {
  try {
    console.log('Testing Cloudinary connection...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'NOT SET');
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'NOT SET');

    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful!', result);
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error.message);
  }
}

testConnection();


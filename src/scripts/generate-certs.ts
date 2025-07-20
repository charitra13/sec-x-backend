import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const certDir = path.join(process.cwd(), 'certs');

export const generateDevCertificates = () => {
  try {
    // Create certs directory if it doesn't exist
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir);
    }

    console.log('🔐 Generating development SSL certificates...');
    
    // Generate self-signed certificate for localhost
    const opensslCmd = `openssl req -x509 -newkey rsa:4096 -keyout ${certDir}/key.pem -out ${certDir}/cert.pem -days 365 -nodes -subj "/C=US/ST=Dev/L=Dev/O=Dev/CN=localhost"`;
    
    execSync(opensslCmd, { stdio: 'inherit' });
    
    console.log('✅ SSL certificates generated successfully!');
    console.log(`📁 Certificates saved to: ${certDir}`);
    
  } catch (error) {
    console.error('❌ Failed to generate SSL certificates:', error);
    console.log('📝 Manual setup required. Please refer to documentation.');
  }
};

// Run if called directly
if (require.main === module) {
  generateDevCertificates();
}
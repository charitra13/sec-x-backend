import dotenv from 'dotenv';
import { allowedOrigins } from '../config/cors.config';
import { corsOptions } from '../config/cors.config';

// Load environment variables
dotenv.config();

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export const validateCORSConfiguration = (): ValidationResult => {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  // Check for required environment variables
  if (!process.env.FRONTEND_URL) {
    result.errors.push('FRONTEND_URL environment variable is not set');
    result.passed = false;
  }

  // Validate allowed origins
  allowedOrigins.forEach((origin, index) => {
    try {
      new URL(origin.url);
    } catch {
      result.errors.push(`Invalid URL format for origin ${index}: ${origin.url}`);
      result.passed = false;
    }

    // Check for security issues
    if (origin.url === '*') {
      result.errors.push('Wildcard origin (*) is not allowed for security');
      result.passed = false;
    }

    if (origin.environment === 'production' && !origin.url.startsWith('https://')) {
      result.errors.push(`Production origin must use HTTPS: ${origin.url}`);
      result.passed = false;
    }

    if (origin.url.includes('localhost') && origin.environment === 'production') {
      result.warnings.push(`Localhost origin in production environment: ${origin.url}`);
    }
  });

  // Check CORS options
  if (!corsOptions.credentials) {
    result.warnings.push('Credentials support is disabled - authentication may not work');
  }

  if (!corsOptions.methods?.includes('OPTIONS')) {
    result.errors.push('OPTIONS method must be included for preflight requests');
    result.passed = false;
  }

  const requiredHeaders = ['Content-Type', 'Authorization'];
  requiredHeaders.forEach(header => {
    if (!corsOptions.allowedHeaders?.includes(header)) {
      result.errors.push(`Required header missing from allowedHeaders: ${header}`);
      result.passed = false;
    }
  });

  return result;
};

// Run validation if called directly
if (require.main === module) {
  console.log('🔍 Validating CORS configuration...\n');
  
  const result = validateCORSConfiguration();
  
  if (result.errors.length > 0) {
    console.log('❌ CORS Configuration Errors:');
    result.errors.forEach(error => console.log(`  • ${error}`));
    console.log('');
  }
  
  if (result.warnings.length > 0) {
    console.log('⚠️  CORS Configuration Warnings:');
    result.warnings.forEach(warning => console.log(`  • ${warning}`));
    console.log('');
  }
  
  if (result.passed) {
    console.log('✅ CORS configuration is valid!');
    process.exit(0);
  } else {
    console.log('❌ CORS configuration has errors - please fix before deployment');
    process.exit(1);
  }
} 
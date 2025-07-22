# 🚀 CORS Security Implementation Roadmap
## Step-by-Step Implementation Guide for sec-x-backend

---

## 📋 **Prerequisites**

Before starting, ensure you have:
- [ ] Node.js and npm installed
- [ ] Current sec-x-backend project accessible
- [ ] VS Code/Cursor AI IDE ready
- [ ] Git for version control

---

# 🔥 **PHASE 1: Critical Security (Week 1)**

## **Step 1.1: Implement Dynamic Origin Validation**

### **1.1.1: Create CORS Configuration Module**

**File to create**: `src/config/cors.config.ts`

```typescript
import { CorsOptions } from 'cors';

interface AllowedOrigin {
  url: string;
  environment: 'development' | 'production' | 'staging';
  description: string;
}

const allowedOrigins: AllowedOrigin[] = [
  {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    environment: 'development',
    description: 'Local development frontend'
  },
  {
    url: 'https://localhost:3000',
    environment: 'development', 
    description: 'Local HTTPS development frontend'
  },
  {
    url: 'https://sec-x.netlify.app',
    environment: 'production',
    description: 'Production frontend (Netlify)'
  },
  {
    url: 'https://sec-x.vercel.app',
    environment: 'production',
    description: 'Production frontend (Vercel)'
  }
];

// Dynamic origin validation function
const corsOriginValidator = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (mobile apps, Postman, curl)
  if (!origin) {
    console.log('[CORS] No origin header - allowing request (likely from mobile app or API tool)');
    return callback(null, true);
  }

  // Check if origin is in allowed list
  const isAllowed = allowedOrigins.some(allowedOrigin => allowedOrigin.url === origin);
  
  if (isAllowed) {
    const originInfo = allowedOrigins.find(ao => ao.url === origin);
    console.log(`[CORS] ✅ Origin allowed: ${origin} (${originInfo?.description})`);
    callback(null, true);
  } else {
    console.error(`[CORS] ❌ Origin blocked: ${origin}`);
    console.error(`[CORS] Allowed origins: ${allowedOrigins.map(ao => ao.url).join(', ')}`);
    
    const corsError = new Error(`CORS policy violation: Origin '${origin}' is not allowed`);
    corsError.name = 'CORSError';
    callback(corsError, false);
  }
};

export const corsOptions: CorsOptions = {
  origin: corsOriginValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  optionsSuccessStatus: 200, // Legacy browser support
  maxAge: 86400 // Cache preflight response for 24 hours
};

export { allowedOrigins };
```

### **1.1.2: Update Main Server File**

**File to modify**: `src/index.ts`

Replace the existing CORS configuration with:

```typescript
// Remove the old cors configuration and replace with:
import { corsOptions } from './config/cors.config';

// Replace this section:
// app.use(cors({
//   origin: [
//     process.env.FRONTEND_URL || 'http://localhost:3000',
//     'https://sec-x.netlify.app',
//     'https://sec-x.vercel.app'
//   ],
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: [
//     'Content-Type',
//     'Authorization',
//     'X-Requested-With',
//     'Accept',
//     'Origin',
//     'Cache-Control',
//     'X-File-Name'
//   ],
//   exposedHeaders: ['X-Total-Count'],
//   optionsSuccessStatus: 200
// }));

// With this:
app.use(cors(corsOptions));
```

## **Step 1.2: Add CORS Error Logging**

### **1.2.1: Create CORS Error Handler Middleware**

**File to create**: `src/middleware/corsError.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

interface CORSErrorDetails {
  origin: string | undefined;
  method: string;
  path: string;
  userAgent: string | undefined;
  referer: string | undefined;
  timestamp: string;
  ip: string;
}

export class CORSViolationError extends AppError {
  public details: CORSErrorDetails;

  constructor(message: string, req: Request) {
    super(message, 403);
    this.name = 'CORSViolationError';
    
    this.details = {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    };
  }
}

export const corsErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Handle CORS-specific errors
  if (err.name === 'CORSError' || err.message.includes('CORS policy violation')) {
    const corsError = new CORSViolationError(err.message, req);
    
    // Log detailed CORS violation information
    console.error('🚨 CORS VIOLATION DETECTED:', {
      error: corsError.message,
      details: corsError.details,
      stack: err.stack
    });

    // In production, you might want to send this to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to monitoring service
      // monitoringService.logCORSViolation(corsError);
    }

    return res.status(403).json({
      success: false,
      error: 'CORS_VIOLATION',
      message: 'Cross-Origin Request Blocked',
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          origin: corsError.details.origin,
          allowedOrigins: process.env.FRONTEND_URL || 'http://localhost:3000'
        }
      })
    });
  }

  // Pass non-CORS errors to the next error handler
  next(err);
};
```

### **1.2.2: Update Error Middleware Chain**

**File to modify**: `src/index.ts`

Add the CORS error handler before the global error handler:

```typescript
// Add this import at the top
import { corsErrorHandler } from './middleware/corsError.middleware';

// Add this BEFORE the existing error handler
app.use(corsErrorHandler);

// Keep the existing global error handler
app.use(errorHandler);
```

## **Step 1.3: Set up HTTPS for Development**

### **1.3.1: Install HTTPS Development Dependencies**

```bash
npm install --save-dev https-localhost
```

### **1.3.2: Create HTTPS Development Script**

**File to create**: `src/scripts/generate-certs.ts`

```typescript
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
```

### **1.3.3: Update Package.json Scripts**

**File to modify**: `package.json`

Add these scripts to the scripts section:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "dev:https": "cross-env HTTPS=true ts-node-dev --respawn --transpile-only src/index.ts",
    "generate-certs": "ts-node src/scripts/generate-certs.ts",
    "setup-https": "npm run generate-certs && npm run dev:https"
  }
}
```

### **1.3.4: Install Cross-env for Windows Compatibility**

```bash
npm install --save-dev cross-env
```

### **1.3.5: Update Environment Variables**

**File to modify**: `.env`

Add HTTPS development configuration:

```env
# Existing variables...

# HTTPS Development Configuration
HTTPS=false
SSL_CERT_PATH=./certs/cert.pem
SSL_KEY_PATH=./certs/key.pem

# Update FRONTEND_URL for HTTPS development
# FRONTEND_URL=http://localhost:3000  # HTTP development
FRONTEND_URL=https://localhost:3000   # HTTPS development
```

### **1.3.6: Update Server for HTTPS Support**

**File to modify**: `src/index.ts`

Add HTTPS server support:

```typescript
import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// ... existing imports

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGODB_URI;
const USE_HTTPS = process.env.HTTPS === 'true';

// ... existing middleware setup

// Create server function
const createServer = () => {
  if (USE_HTTPS && process.env.NODE_ENV === 'development') {
    const certPath = process.env.SSL_CERT_PATH || './certs/cert.pem';
    const keyPath = process.env.SSL_KEY_PATH || './certs/key.pem';
    
    try {
      const httpsOptions = {
        cert: fs.readFileSync(path.resolve(certPath)),
        key: fs.readFileSync(path.resolve(keyPath))
      };
      
      console.log('🔐 Creating HTTPS server for development...');
      return https.createServer(httpsOptions, app);
    } catch (error) {
      console.warn('⚠️  HTTPS certificates not found, falling back to HTTP');
      console.log('💡 Run "npm run generate-certs" to create development certificates');
      return http.createServer(app);
    }
  }
  
  return http.createServer(app);
};

// Update the startServer function
const startServer = async () => {
  if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGODB_URI is not defined.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Successfully connected to MongoDB!');
    
    const server = createServer();
    const protocol = USE_HTTPS && process.env.NODE_ENV === 'development' ? 'https' : 'http';
    
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on ${protocol}://localhost:${PORT}`);
      console.log(`📚 API Documentation: ${protocol}://localhost:${PORT}/api/health`);
      
      if (USE_HTTPS && process.env.NODE_ENV === 'development') {
        console.log('🔐 HTTPS mode enabled for development');
        console.log('⚠️  You may need to accept the self-signed certificate in your browser');
      }
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

startServer();

export default app;
```

---

# 🔍 **PHASE 2: Enhanced Monitoring (Week 2)**

## **Step 2.1: Add Origin Request Validation Middleware**

### **2.1.1: Create Origin Validation Middleware**

**File to create**: `src/middleware/originValidation.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

interface OriginValidationResult {
  isValid: boolean;
  warnings: string[];
  details: {
    origin: string | undefined;
    referer: string | undefined;
    userAgent: string | undefined;
    suspiciousPatterns: string[];
  };
}

export const validateOriginRequest = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const userAgent = req.headers['user-agent'];
  
  const result: OriginValidationResult = {
    isValid: true,
    warnings: [],
    details: {
      origin,
      referer,
      userAgent,
      suspiciousPatterns: []
    }
  };

  // Skip validation for requests without origin (API calls, mobile apps)
  if (!origin) {
    return next();
  }

  try {
    // Validate origin format
    const originUrl = new URL(origin);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /localhost:\d+$/, message: 'Localhost with non-standard port' },
      { pattern: /(\d+\.){3}\d+/, message: 'IP address instead of domain' },
      { pattern: /[^\w\-\.]/, message: 'Suspicious characters in domain' },
    ];

    suspiciousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(originUrl.hostname)) {
        result.details.suspiciousPatterns.push(message);
        result.warnings.push(`Suspicious origin pattern: ${message}`);
      }
    });

    // Cross-reference with referer if available
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        
        // Check if origin and referer domains match
        if (originUrl.hostname !== refererUrl.hostname) {
          result.warnings.push(`Origin domain (${originUrl.hostname}) doesn't match referer domain (${refererUrl.hostname})`);
        }
        
        // Check for protocol mismatch
        if (originUrl.protocol !== refererUrl.protocol) {
          result.warnings.push(`Protocol mismatch: Origin (${originUrl.protocol}) vs Referer (${refererUrl.protocol})`);
        }
      } catch (refererError) {
        result.warnings.push('Invalid referer URL format');
      }
    }

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn('🔍 Origin validation warnings:', {
        origin,
        referer,
        userAgent: userAgent?.substring(0, 100), // Truncate long user agents
        warnings: result.warnings,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }

    // Add validation result to request for potential use in other middleware
    (req as any).originValidation = result;
    
  } catch (error) {
    result.isValid = false;
    result.warnings.push('Invalid origin URL format');
    
    console.error('❌ Origin validation error:', {
      origin,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip
    });
  }

  next();
};

// Middleware to block requests with too many warnings
export const blockSuspiciousOrigins = (maxWarnings: number = 3) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = (req as any).originValidation as OriginValidationResult;
    
    if (validation && validation.warnings.length >= maxWarnings) {
      console.error('🚨 Blocking suspicious origin request:', {
        origin: req.headers.origin,
        warnings: validation.warnings,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.status(403).json({
        success: false,
        error: 'SUSPICIOUS_ORIGIN',
        message: 'Request blocked due to suspicious origin patterns'
      });
    }
    
    next();
  };
};
```

### **2.1.2: Apply Origin Validation Middleware**

**File to modify**: `src/index.ts`

Add the origin validation middleware:

```typescript
// Add this import
import { validateOriginRequest, blockSuspiciousOrigins } from './middleware/originValidation.middleware';

// Add these middleware AFTER CORS but BEFORE routes
app.use(validateOriginRequest);
app.use(blockSuspiciousOrigins(2)); // Block requests with 2+ warnings

// ... existing routes
```

## **Step 2.2: Implement CORS Violation Alerts**

### **2.2.1: Create Alert System**

**File to create**: `src/utils/alertSystem.ts`

```typescript
interface CORSAlert {
  id: string;
  timestamp: string;
  type: 'VIOLATION' | 'SUSPICIOUS' | 'BLOCKED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  origin: string;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
}

class CORSAlertSystem {
  private alerts: CORSAlert[] = [];
  private readonly maxAlerts = 1000; // Keep last 1000 alerts in memory
  private violationCounts = new Map<string, number>();
  private readonly alertThresholds = {
    LOW: 5,      // 5 violations per hour
    MEDIUM: 10,  // 10 violations per hour
    HIGH: 20,    // 20 violations per hour
    CRITICAL: 50 // 50 violations per hour
  };

  generateAlert(
    type: CORSAlert['type'],
    origin: string,
    ip: string,
    userAgent: string,
    details: Record<string, any> = {}
  ): CORSAlert {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Count violations by origin
    const key = `${origin}-${ip}`;
    const currentCount = this.violationCounts.get(key) || 0;
    this.violationCounts.set(key, currentCount + 1);
    
    // Determine severity based on frequency
    let severity: CORSAlert['severity'] = 'LOW';
    if (currentCount >= this.alertThresholds.CRITICAL) severity = 'CRITICAL';
    else if (currentCount >= this.alertThresholds.HIGH) severity = 'HIGH';
    else if (currentCount >= this.alertThresholds.MEDIUM) severity = 'MEDIUM';
    
    const alert: CORSAlert = {
      id,
      timestamp,
      type,
      severity,
      origin,
      ip,
      userAgent: userAgent.substring(0, 200), // Truncate long user agents
      details: {
        ...details,
        violationCount: currentCount + 1
      }
    };

    this.alerts.unshift(alert); // Add to beginning
    
    // Maintain max alerts limit
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    // Log alert
    this.logAlert(alert);
    
    // Send to external monitoring if configured
    this.sendToMonitoring(alert);
    
    return alert;
  }

  private logAlert(alert: CORSAlert) {
    const logLevel = alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'error' : 'warn';
    const emoji = {
      'VIOLATION': '🚨',
      'SUSPICIOUS': '⚠️',
      'BLOCKED': '🛡️'
    }[alert.type];

    console[logLevel](`${emoji} CORS Alert [${alert.severity}]:`, {
      id: alert.id,
      type: alert.type,
      origin: alert.origin,
      ip: alert.ip,
      violationCount: alert.details.violationCount,
      timestamp: alert.timestamp
    });
  }

  private async sendToMonitoring(alert: CORSAlert) {
    if (process.env.NODE_ENV === 'production' && process.env.MONITORING_WEBHOOK_URL) {
      try {
        // Example: Send to Slack, Discord, or monitoring service
        // await fetch(process.env.MONITORING_WEBHOOK_URL, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     text: `CORS Alert: ${alert.type} from ${alert.origin}`,
        //     severity: alert.severity,
        //     details: alert
        //   })
        // });
      } catch (error) {
        console.error('Failed to send alert to monitoring:', error);
      }
    }
  }

  getRecentAlerts(limit: number = 50): CORSAlert[] {
    return this.alerts.slice(0, limit);
  }

  getAlertStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentAlerts = this.alerts.filter(
      alert => now - new Date(alert.timestamp).getTime() < oneHour
    );

    return {
      total: this.alerts.length,
      lastHour: recentAlerts.length,
      bySeverity: {
        CRITICAL: recentAlerts.filter(a => a.severity === 'CRITICAL').length,
        HIGH: recentAlerts.filter(a => a.severity === 'HIGH').length,
        MEDIUM: recentAlerts.filter(a => a.severity === 'MEDIUM').length,
        LOW: recentAlerts.filter(a => a.severity === 'LOW').length
      },
      topOrigins: this.getTopViolatingOrigins(recentAlerts)
    };
  }

  private getTopViolatingOrigins(alerts: CORSAlert[]): Array<{origin: string, count: number}> {
    const originCounts = new Map<string, number>();
    alerts.forEach(alert => {
      const count = originCounts.get(alert.origin) || 0;
      originCounts.set(alert.origin, count + 1);
    });

    return Array.from(originCounts.entries())
      .map(([origin, count]) => ({ origin, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Clean up old violation counts (call periodically)
  cleanupOldCounts() {
    // Reset violation counts every hour
    this.violationCounts.clear();
  }
}

export const corsAlertSystem = new CORSAlertSystem();

// Cleanup old counts every hour
setInterval(() => {
  corsAlertSystem.cleanupOldCounts();
}, 60 * 60 * 1000);
```

### **2.2.2: Integrate Alert System with CORS Error Handler**

**File to modify**: `src/middleware/corsError.middleware.ts`

Update the CORS error handler to use the alert system:

```typescript
import { corsAlertSystem } from '../utils/alertSystem';

export const corsErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'CORSError' || err.message.includes('CORS policy violation')) {
    const corsError = new CORSViolationError(err.message, req);
    
    // Generate CORS violation alert
    corsAlertSystem.generateAlert(
      'VIOLATION',
      corsError.details.origin || 'unknown',
      corsError.details.ip,
      corsError.details.userAgent || 'unknown',
      {
        method: corsError.details.method,
        path: corsError.details.path,
        referer: corsError.details.referer,
        errorMessage: err.message
      }
    );

    // ... rest of existing error handling
  }

  next(err);
};
```

## **Step 2.3: Create CORS Debugging Endpoint**

### **2.3.1: Create CORS Debug Controller**

**File to create**: `src/controllers/corsDebug.controller.ts`

```typescript
import { Request, Response } from 'express';
import { corsAlertSystem } from '../utils/alertSystem';
import { allowedOrigins } from '../config/cors.config';

export const getCORSStatus = (req: Request, res: Response) => {
  const origin = req.headers.origin;
  const userAgent = req.headers['user-agent'];
  
  const status = {
    currentOrigin: origin,
    isOriginAllowed: allowedOrigins.some(ao => ao.url === origin),
    allowedOrigins: allowedOrigins.map(ao => ({
      url: ao.url,
      environment: ao.environment,
      description: ao.description
    })),
    requestHeaders: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: userAgent?.substring(0, 100),
      host: req.headers.host,
      'accept': req.headers.accept
    },
    corsConfiguration: {
      credentialsEnabled: true,
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name'
      ],
      exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      maxAge: 86400
    },
    serverInfo: {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    }
  };

  res.json({
    success: true,
    data: status
  });
};

export const getCORSAlerts = (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const alerts = corsAlertSystem.getRecentAlerts(limit);
  const stats = corsAlertSystem.getAlertStats();

  res.json({
    success: true,
    data: {
      alerts,
      stats,
      summary: {
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
        lastAlert: alerts[0]?.timestamp || null
      }
    }
  });
};

export const testCORSOrigin = (req: Request, res: Response) => {
  const { testOrigin } = req.body;
  
  if (!testOrigin) {
    return res.status(400).json({
      success: false,
      message: 'testOrigin is required in request body'
    });
  }

  const isAllowed = allowedOrigins.some(ao => ao.url === testOrigin);
  const matchingOrigin = allowedOrigins.find(ao => ao.url === testOrigin);
  
  res.json({
    success: true,
    data: {
      testOrigin,
      isAllowed,
      originInfo: matchingOrigin || null,
      recommendations: isAllowed 
        ? ['Origin is properly configured']
        : [
            'Add this origin to the allowedOrigins configuration',
            'Ensure the origin URL exactly matches (including protocol and port)',
            'Check for typos in the domain name'
          ]
    }
  });
};
```

### **2.3.2: Create CORS Debug Routes**

**File to create**: `src/routes/corsDebug.routes.ts`

```typescript
import { Router } from 'express';
import { getCORSStatus, getCORSAlerts, testCORSOrigin } from '../controllers/corsDebug.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public CORS status endpoint (for debugging)
router.get('/status', getCORSStatus);

// Protected admin endpoints
router.use(protect);
router.use(authorize('admin'));

router.get('/alerts', getCORSAlerts);
router.post('/test-origin', testCORSOrigin);

export default router;
```

### **2.3.3: Add Debug Routes to Main App**

**File to modify**: `src/index.ts`

Add the CORS debug routes:

```typescript
// Add this import
import corsDebugRoutes from './routes/corsDebug.routes';

// Add this route (after existing API routes)
app.use('/api/cors-debug', corsDebugRoutes);
```

---

# 🛡️ **PHASE 3: Production Hardening (Week 3)**

## **Step 3.1: Add Rate Limiting for OPTIONS Requests**

### **3.1.1: Create Specialized Rate Limiters**

**File to modify**: `src/middleware/rateLimiter.ts`

Add OPTIONS-specific rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

// ... existing rate limiters

// Specialized rate limiter for OPTIONS requests (preflight)
export const optionsLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  20, // 20 OPTIONS requests per 5 minutes per IP
  'Too many preflight requests, please try again later'
);

// Aggressive rate limiter for suspicious patterns
export const suspiciousOriginLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes  
  3, // Only 3 requests per 15 minutes for blocked origins
  'Origin blocked due to repeated CORS violations'
);

// Create a smart rate limiter that adapts based on request type
export const smartCORSLimiter = (req: any, res: any) => {
  const origin = req.headers.origin;
  const isOptionsRequest = req.method === 'OPTIONS';
  const hasOriginWarnings = req.originValidation?.warnings?.length > 0;
  
  // Apply different limits based on request characteristics
  if (isOptionsRequest) {
    return optionsLimiter(req, res, () => {});
  } else if (hasOriginWarnings) {
    return suspiciousOriginLimiter(req, res, () => {});
  } else {
    return generalLimiter(req, res, () => {});
  }
};
```

### **3.1.2: Apply Smart Rate Limiting**

**File to modify**: `src/index.ts`

Replace the general rate limiter with smart CORS rate limiting:

```typescript
// Replace this line:
// app.use(generalLimiter);

// With this:
import { smartCORSLimiter } from './middleware/rateLimiter';

app.use((req, res, next) => {
  smartCORSLimiter(req, res);
  next();
});
```

## **Step 3.2: Implement Origin Whitelist Management**

### **3.2.1: Create Origin Management System**

**File to create**: `src/services/originManagement.service.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

interface ManagedOrigin {
  id: string;
  url: string;
  environment: 'development' | 'staging' | 'production';
  description: string;
  addedBy: string;
  addedAt: string;
  lastUsed?: string;
  usageCount: number;
  isActive: boolean;
  tags: string[];
}

class OriginManagementService {
  private originsFilePath = path.join(process.cwd(), 'config', 'managed-origins.json');
  private origins: ManagedOrigin[] = [];

  async loadOrigins(): Promise<void> {
    try {
      const data = await fs.readFile(this.originsFilePath, 'utf-8');
      this.origins = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      this.origins = [];
      await this.saveOrigins();
    }
  }

  async saveOrigins(): Promise<void> {
    try {
      // Ensure config directory exists
      await fs.mkdir(path.dirname(this.originsFilePath), { recursive: true });
      await fs.writeFile(this.originsFilePath, JSON.stringify(this.origins, null, 2));
    } catch (error) {
      console.error('Failed to save origins configuration:', error);
    }
  }

  async addOrigin(originData: Omit<ManagedOrigin, 'id' | 'addedAt' | 'usageCount' | 'lastUsed'>): Promise<ManagedOrigin> {
    const newOrigin: ManagedOrigin = {
      ...originData,
      id: `origin_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      addedAt: new Date().toISOString(),
      usageCount: 0
    };

    this.origins.push(newOrigin);
    await this.saveOrigins();
    
    console.log(`✅ Added new origin: ${newOrigin.url} (${newOrigin.environment})`);
    return newOrigin;
  }

  async removeOrigin(originId: string): Promise<boolean> {
    const index = this.origins.findIndex(o => o.id === originId);
    if (index === -1) return false;

    const removedOrigin = this.origins.splice(index, 1)[0];
    await this.saveOrigins();
    
    console.log(`🗑️  Removed origin: ${removedOrigin.url}`);
    return true;
  }

  async updateOrigin(originId: string, updates: Partial<ManagedOrigin>): Promise<ManagedOrigin | null> {
    const origin = this.origins.find(o => o.id === originId);
    if (!origin) return null;

    Object.assign(origin, updates);
    await this.saveOrigins();
    
    console.log(`📝 Updated origin: ${origin.url}`);
    return origin;
  }

  async recordOriginUsage(originUrl: string): Promise<void> {
    const origin = this.origins.find(o => o.url === originUrl);
    if (origin) {
      origin.usageCount++;
      origin.lastUsed = new Date().toISOString();
      await this.saveOrigins();
    }
  }

  getActiveOrigins(environment?: string): string[] {
    return this.origins
      .filter(o => o.isActive && (!environment || o.environment === environment))
      .map(o => o.url);
  }

  getAllOrigins(): ManagedOrigin[] {
    return [...this.origins];
  }

  getOriginStats() {
    const total = this.origins.length;
    const active = this.origins.filter(o => o.isActive).length;
    const byEnvironment = {
      development: this.origins.filter(o => o.environment === 'development').length,
      staging: this.origins.filter(o => o.environment === 'staging').length,
      production: this.origins.filter(o => o.environment === 'production').length
    };

    return {
      total,
      active,
      inactive: total - active,
      byEnvironment,
      mostUsed: this.origins
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(o => ({ url: o.url, usageCount: o.usageCount }))
    };
  }
}

export const originManagementService = new OriginManagementService();

// Initialize on startup
originManagementService.loadOrigins().catch(console.error);
```

### **3.2.2: Create Origin Management Controller**

**File to create**: `src/controllers/originManagement.controller.ts`

```typescript
import { Request, Response } from 'express';
import { originManagementService } from '../services/originManagement.service';
import { IAuthRequest } from '../middleware/auth.middleware';

export const getAllOrigins = async (req: Request, res: Response) => {
  try {
    const origins = originManagementService.getAllOrigins();
    const stats = originManagementService.getOriginStats();

    res.json({
      success: true,
      data: {
        origins,
        stats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch origins',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const addOrigin = async (req: IAuthRequest, res: Response) => {
  try {
    const { url, environment, description, tags = [] } = req.body;
    
    if (!url || !environment || !description) {
      return res.status(400).json({
        success: false,
        message: 'url, environment, and description are required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    const newOrigin = await originManagementService.addOrigin({
      url,
      environment,
      description,
      addedBy: req.user?.email || 'system',
      isActive: true,
      tags
    });

    res.status(201).json({
      success: true,
      message: 'Origin added successfully',
      data: newOrigin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add origin',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateOrigin = async (req: Request, res: Response) => {
  try {
    const { originId } = req.params;
    const updates = req.body;

    const updatedOrigin = await originManagementService.updateOrigin(originId, updates);
    
    if (!updatedOrigin) {
      return res.status(404).json({
        success: false,
        message: 'Origin not found'
      });
    }

    res.json({
      success: true,
      message: 'Origin updated successfully',
      data: updatedOrigin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update origin',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const removeOrigin = async (req: Request, res: Response) => {
  try {
    const { originId } = req.params;
    
    const removed = await originManagementService.removeOrigin(originId);
    
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Origin not found'
      });
    }

    res.json({
      success: true,
      message: 'Origin removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove origin',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
```

### **3.2.3: Create Origin Management Routes**

**File to create**: `src/routes/originManagement.routes.ts`

```typescript
import { Router } from 'express';
import { getAllOrigins, addOrigin, updateOrigin, removeOrigin } from '../controllers/originManagement.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllOrigins);
router.post('/', addOrigin);
router.put('/:originId', updateOrigin);
router.delete('/:originId', removeOrigin);

export default router;
```

### **3.2.4: Integrate with Main App**

**File to modify**: `src/index.ts`

Add the origin management routes:

```typescript
// Add import
import originManagementRoutes from './routes/originManagement.routes';

// Add route
app.use('/api/admin/origins', originManagementRoutes);
```

## **Step 3.3: Add CORS Policy Documentation**

### **3.3.1: Create CORS Documentation Endpoint**

**File to create**: `src/controllers/corsDocumentation.controller.ts`

```typescript
import { Request, Response } from 'express';
import { allowedOrigins } from '../config/cors.config';

export const getCORSDocumentation = (req: Request, res: Response) => {
  const documentation = {
    title: 'CORS Policy Documentation',
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    
    overview: {
      description: 'Cross-Origin Resource Sharing (CORS) policy for SecurityX Backend API',
      purpose: 'Control which frontend applications can access our API resources',
      compliance: 'Follows CORS best practices and security guidelines'
    },

    configuration: {
      credentialsSupported: true,
      description: 'Credentials (cookies, authorization headers) are supported for authenticated requests',
      
      allowedMethods: [
        'GET - Retrieve data',
        'POST - Create new resources', 
        'PUT - Update existing resources',
        'DELETE - Remove resources',
        'PATCH - Partial updates',
        'OPTIONS - Preflight requests'
      ],
      
      allowedHeaders: [
        'Content-Type - Request body format',
        'Authorization - Bearer tokens for authentication',
        'X-Requested-With - AJAX request identification',
        'Accept - Response format preference',
        'Origin - Request origin identification',
        'Cache-Control - Caching directives',
        'X-File-Name - File upload metadata'
      ],
      
      exposedHeaders: [
        'X-Total-Count - Pagination total count',
        'X-RateLimit-Remaining - Rate limit remaining requests',
        'X-RateLimit-Reset - Rate limit reset time'
      ],

      maxAge: '86400 seconds (24 hours) - Preflight cache duration'
    },

    allowedOrigins: {
      description: 'Specific domains authorized to access the API',
      origins: allowedOrigins.map(origin => ({
        url: origin.url,
        environment: origin.environment,
        description: origin.description,
        https: origin.url.startsWith('https://'),
        localhost: origin.url.includes('localhost')
      })),
      
      securityNotes: [
        'No wildcard (*) origins are allowed for security',
        'All production origins must use HTTPS',
        'Origin validation is performed on every request',
        'Suspicious origin patterns are monitored and logged'
      ]
    },

    commonIssues: {
      'preflight-failed': {
        description: 'OPTIONS request blocked or failed',
        solutions: [
          'Ensure server supports OPTIONS method',
          'Check if origin is in allowed list',
          'Verify request headers are permitted'
        ]
      },
      
      'credentials-blocked': {
        description: 'Authentication cookies/tokens not sent',
        solutions: [
          'Set credentials: "include" in fetch requests',
          'Ensure withCredentials: true in axios',
          'Verify origin supports credentials'
        ]
      },
      
      'origin-mismatch': {
        description: 'Request origin not in allowed list',
        solutions: [
          'Add origin to allowedOrigins configuration',
          'Check for typos in domain name',
          'Ensure protocol (http/https) matches exactly'
        ]
      },
      
      'mixed-content': {
        description: 'HTTPS frontend calling HTTP API',
        solutions: [
          'Use HTTPS for both frontend and backend',
          'Configure SSL certificates for development',
          'Update API endpoints to use HTTPS'
        ]
      }
    },

    bestPractices: [
      'Always use specific origins instead of wildcards',
      'Enable HTTPS in production environments',
      'Monitor CORS violations for security threats',
      'Implement proper error handling for CORS failures',
      'Use rate limiting to prevent CORS abuse',
      'Regularly audit and update allowed origins list',
      'Log and alert on suspicious CORS patterns'
    ],

    developmentTips: [
      'Use browser developer tools to inspect CORS errors',
      'Test with different origins during development',
      'Verify preflight requests are handled correctly',
      'Check network tab for failed OPTIONS requests',
      'Use CORS debugging endpoints for troubleshooting'
    ],

    endpoints: {
      debug: '/api/cors-debug/status - Check current CORS configuration',
      alerts: '/api/cors-debug/alerts - View CORS violation alerts (admin only)',
      testOrigin: '/api/cors-debug/test-origin - Test if origin is allowed (admin only)',
      documentation: '/api/cors/docs - This documentation endpoint'
    }
  };

  res.json({
    success: true,
    data: documentation
  });
};

export const getCORSSchema = (req: Request, res: Response) => {
  const schema = {
    type: 'object',
    properties: {
      origin: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
        description: 'List of allowed origins'
      },
      credentials: {
        type: 'boolean',
        description: 'Whether to support credentials'
      },
      methods: {
        type: 'array',
        items: { type: 'string' },
        description: 'Allowed HTTP methods'
      },
      allowedHeaders: {
        type: 'array',
        items: { type: 'string' },
        description: 'Headers that can be sent by client'
      },
      exposedHeaders: {
        type: 'array',
        items: { type: 'string' },
        description: 'Headers exposed to client'
      },
      maxAge: {
        type: 'number',
        description: 'Preflight cache duration in seconds'
      }
    },
    example: {
      origin: ['https://example.com', 'https://app.example.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count'],
      maxAge: 86400
    }
  };

  res.json({
    success: true,
    data: schema
  });
};
```

### **3.3.2: Create CORS Documentation Routes**

**File to create**: `src/routes/corsDocumentation.routes.ts`

```typescript
import { Router } from 'express';
import { getCORSDocumentation, getCORSSchema } from '../controllers/corsDocumentation.controller';

const router = Router();

// Public documentation endpoints
router.get('/docs', getCORSDocumentation);
router.get('/schema', getCORSSchema);

export default router;
```

### **3.3.3: Add Documentation Routes to Main App**

**File to modify**: `src/index.ts`

Add the CORS documentation routes:

```typescript
// Add import
import corsDocumentationRoutes from './routes/corsDocumentation.routes';

// Add route
app.use('/api/cors', corsDocumentationRoutes);
```

---

# 🧪 **Testing & Validation**

## **Step 4.1: Create CORS Test Suite**

### **4.1.1: Install Testing Dependencies**

```bash
npm install --save-dev jest supertest @types/jest @types/supertest
```

### **4.1.2: Create CORS Test File**

**File to create**: `src/tests/cors.test.ts`

```typescript
import request from 'supertest';
import app from '../index';

describe('CORS Configuration Tests', () => {
  describe('Allowed Origins', () => {
    test('should allow requests from localhost:3000', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should allow requests from production domains', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://sec-x.netlify.app')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://sec-x.netlify.app');
    });

    test('should block requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect(403);

      expect(response.body.error).toBe('CORS_VIOLATION');
    });
  });

  describe('Preflight Requests', () => {
    test('should handle OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options('/api/blogs')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(200);

      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });
  });

  describe('CORS Debug Endpoints', () => {
    test('should return CORS status information', async () => {
      const response = await request(app)
        .get('/api/cors-debug/status')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isOriginAllowed).toBe(true);
      expect(response.body.data.allowedOrigins).toBeInstanceOf(Array);
    });
  });
});
```

### **4.1.3: Add Test Script to Package.json**

**File to modify**: `package.json`

Add test script:

```json
{
  "scripts": {
    "test": "jest",
    "test:cors": "jest src/tests/cors.test.ts",
    "test:watch": "jest --watch"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"]
  }
}
```

## **Step 4.2: Create Deployment Checklist**

### **4.2.1: Create Pre-Deployment Validation Script**

**File to create**: `src/scripts/validate-cors.ts`

```typescript
import { allowedOrigins } from '../config/cors.config';
import { corsOptions } from '../config/cors.config';

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
```

### **4.2.2: Add Validation Script to Package.json**

**File to modify**: `package.json`

Add validation scripts:

```json
{
  "scripts": {
    "validate:cors": "ts-node src/scripts/validate-cors.ts",
    "pre-deploy": "npm run validate:cors && npm run test:cors",
    "deploy": "npm run pre-deploy && npm run build"
  }
}
```

---

# 📚 **Usage Instructions**

## **For Cursor AI IDE Implementation:**

### **1. Copy Files Step by Step:**
1. Create each file in the exact path specified
2. Copy the code blocks into respective files
3. Install dependencies as listed in each phase

### **2. Cursor AI Prompts to Use:**

```
Create file src/config/cors.config.ts with the CORS configuration module as specified in the implementation guide
```

```
Update src/index.ts to use the new CORS configuration and add HTTPS support as shown in Phase 1
```

```
Create the CORS error handling middleware in src/middleware/corsError.middleware.ts
```

```
Implement the origin validation middleware in src/middleware/originValidation.middleware.ts
```

### **3. Environment Setup:**
```bash
# Install all required dependencies
npm install cors morgan helmet compression https-localhost cross-env

# Install dev dependencies  
npm install --save-dev @types/cors jest supertest @types/jest @types/supertest

# Generate SSL certificates for HTTPS development
npm run generate-certs

# Start HTTPS development server
npm run dev:https
```

### **4. Testing Commands:**
```bash
# Validate CORS configuration
npm run validate:cors

# Run CORS-specific tests
npm run test:cors

# Pre-deployment validation
npm run pre-deploy
```

### **5. API Endpoints for Testing:**
- `GET /api/cors-debug/status` - Check CORS status
- `GET /api/cors-debug/alerts` - View CORS alerts (admin)
- `POST /api/cors-debug/test-origin` - Test origin (admin)
- `GET /api/cors/docs` - CORS documentation
- `GET /api/admin/origins` - Manage origins (admin)

---

# 🎯 **Success Criteria**

After completing all phases, you should have:

✅ **Dynamic origin validation** with detailed logging  
✅ **HTTPS development environment** matching production  
✅ **Comprehensive CORS error handling** and alerting  
✅ **Smart rate limiting** for different request types  
✅ **Origin whitelist management** system  
✅ **Complete CORS documentation** and debugging tools  
✅ **Automated testing** and validation  
✅ **Production-ready security** hardening  

Your CORS implementation will exceed industry standards and provide enterprise-level security and monitoring capabilities!
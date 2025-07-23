# Backend CORS Security Implementation for SecurityX Blog

## Context
You are implementing a comprehensive CORS (Cross-Origin Resource Sharing) configuration for the SecurityX blog backend. The backend is an Express.js application running on port 8080 that serves a Next.js frontend deployed on Netlify/Vercel. The current basic CORS setup needs to be enhanced for production security and proper cookie-based authentication.

## Current State
- Backend: Express.js with TypeScript on port 8080
- Simple CORS configuration in `src/index.ts`
- JWT authentication with cookies
- API routes: `/api/auth`, `/api/users`, `/api/blogs`, `/api/comments`

## Implementation Tasks

### Task 1: Create Advanced CORS Configuration Module

**Create a new file: `src/config/cors.config.ts`**

```typescript
import { CorsOptions } from 'cors';

interface AllowedOrigin {
  url: string;
  environment: 'development' | 'production' | 'staging';
  description: string;
}

// Define all allowed origins with metadata for better management
export const allowedOrigins: AllowedOrigin[] = [
  // Development origins
  {
    url: 'http://localhost:3000',
    environment: 'development',
    description: 'Local Next.js development server'
  },
  {
    url: 'https://localhost:3000',
    environment: 'development',
    description: 'Local Next.js development server (HTTPS)'
  },
  // Production origins
  {
    url: 'https://sec-x.netlify.app',
    environment: 'production',
    description: 'Production frontend on Netlify'
  },
  {
    url: 'https://sec-x.vercel.app',
    environment: 'production',
    description: 'Production frontend on Vercel'
  }
];

// Dynamic origin validation with detailed logging
const corsOriginValidator = (
  origin: string | undefined, 
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow requests with no origin (Postman, curl, server-to-server)
  if (!origin) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CORS] No origin header - allowing request (API tool/server request)');
    }
    return callback(null, true);
  }

  // Check if origin is in allowed list
  const isAllowed = allowedOrigins.some(
    allowedOrigin => allowedOrigin.url === origin
  );
  
  if (isAllowed) {
    const originInfo = allowedOrigins.find(ao => ao.url === origin);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CORS] ✅ Origin allowed: ${origin} (${originInfo?.description})`);
    }
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
  credentials: true, // Essential for cookie-based auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie',
    'Cache-Control',
    'X-CSRF-Token'
  ],
  exposedHeaders: [
    'X-Total-Count', // For pagination
    'X-Page-Count',
    'X-Page',
    'X-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  maxAge: 86400, // 24 hours cache for preflight
  optionsSuccessStatus: 200 // Legacy browser support
};
```

### Task 2: Create CORS Error Handling Middleware

**Create a new file: `src/middleware/corsError.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export const corsErrorHandler = (
  err: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  if (err && err.name === 'CORSError') {
    // Log CORS violations for security monitoring
    console.error({
      type: 'CORS_VIOLATION',
      timestamp: new Date().toISOString(),
      origin: req.headers.origin || 'none',
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'CORS_POLICY_VIOLATION',
        message: 'This origin is not allowed to access this resource',
        origin: req.headers.origin,
        allowedOrigins: process.env.NODE_ENV === 'development' 
          ? allowedOrigins.map(ao => ao.url)
          : undefined // Don't expose origins in production
      }
    });
  } else {
    next(err);
  }
};
```

### Task 3: Create Security Headers Middleware

**Create a new file: `src/middleware/security.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // HSTS for production only
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://api.cloudinary.com;"
    );
  }
  
  next();
};
```

### Task 4: Update Main Server File

**Update file: `src/index.ts`**

```typescript
// Add these imports at the top
import { corsOptions } from './config/cors.config';
import { corsErrorHandler } from './middleware/corsError.middleware';
import { securityHeaders } from './middleware/security.middleware';

// Remove the old CORS configuration and replace with:
// Apply security headers before CORS
app.use(securityHeaders);

// Apply CORS with advanced configuration
app.use(cors(corsOptions));

// Add CORS-specific logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers.origin) {
      console.log(`[CORS Request] ${req.method} ${req.path} from ${req.headers.origin}`);
    }
    next();
  });
}

// ... other middleware ...

// Add CORS error handler after other error handlers but before the global error handler
app.use(corsErrorHandler);
app.use(errorHandler); // Your existing error handler
```

### Task 5: Update Authentication Cookie Configuration

**Update file: `src/controllers/auth.controller.ts`**

Find where cookies are set (likely in login/register functions) and update:

```typescript
// In your login/register success responses
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  // Add domain option if needed for subdomains
  // domain: process.env.COOKIE_DOMAIN
};

res.cookie('token', token, cookieOptions);
```

### Task 6: Create CORS Testing Endpoints

**Create a new file: `src/routes/corsDebug.routes.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth.middleware';
import { allowedOrigins } from '../config/cors.config';

const router = Router();

// Public endpoint to test CORS
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'CORS test successful',
    origin: req.headers.origin || 'no-origin',
    method: req.method,
    credentials: req.credentials,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'present' : 'absent',
      'cookie': req.headers.cookie ? 'present' : 'absent'
    }
  });
});

// Protected endpoint to test CORS with auth
router.get('/test-auth', protect, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Authenticated CORS test successful',
    user: req.user,
    origin: req.headers.origin
  });
});

// Admin endpoint to view CORS configuration
router.get('/config', protect, (req: Request, res: Response) => {
  // Only allow admins to see CORS config
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }

  res.json({
    success: true,
    corsConfig: {
      allowedOrigins: allowedOrigins.map(ao => ({
        url: ao.url,
        environment: ao.environment,
        description: ao.description
      })),
      credentials: true,
      methods: corsOptions.methods,
      allowedHeaders: corsOptions.allowedHeaders,
      exposedHeaders: corsOptions.exposedHeaders,
      maxAge: corsOptions.maxAge
    }
  });
});

export default router;
```

**Add to `src/index.ts`:**

```typescript
import corsDebugRoutes from './routes/corsDebug.routes';

// Add with other routes
app.use('/api/cors-debug', corsDebugRoutes);
```

### Task 7: Update Environment Variables

**Update `.env` file:**

```env
# Existing variables...

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000
CORS_MAX_AGE=86400

# Cookie Configuration
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=
```

**Update `.env.production` file:**

```env
# Existing variables...

# CORS Configuration
FRONTEND_URL=https://sec-x.netlify.app
ALLOWED_ORIGINS=https://sec-x.netlify.app,https://sec-x.vercel.app
CORS_MAX_AGE=86400

# Cookie Configuration
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=
```

### Task 8: Add CORS Monitoring

**Create a new file: `src/utils/corsMonitoring.ts`**

```typescript
interface CORSViolation {
  timestamp: Date;
  origin: string;
  method: string;
  path: string;
  userAgent?: string;
  ip?: string;
}

class CORSMonitor {
  private violations: CORSViolation[] = [];
  private maxViolations = 1000;

  logViolation(violation: CORSViolation) {
    this.violations.push(violation);
    
    // Keep only recent violations
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-this.maxViolations);
    }

    // In production, you might want to send this to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // monitoringService.logSecurityEvent('cors_violation', violation);
    }
  }

  getViolations(limit: number = 100): CORSViolation[] {
    return this.violations.slice(-limit);
  }

  getViolationStats() {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentViolations = this.violations.filter(v => v.timestamp > last24h);
    
    const originCounts = recentViolations.reduce((acc, v) => {
      acc[v.origin] = (acc[v.origin] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.violations.length,
      last24h: recentViolations.length,
      byOrigin: originCounts
    };
  }
}

export const corsMonitor = new CORSMonitor();
```

## Testing Instructions

### 1. Basic CORS Test
```bash
# Test from allowed origin
curl -X GET http://localhost:8080/api/cors-debug/test \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -v

# Test from blocked origin
curl -X GET http://localhost:8080/api/cors-debug/test \
  -H "Origin: http://malicious-site.com" \
  -H "Content-Type: application/json" \
  -v
```

### 2. Preflight Request Test
```bash
# Test OPTIONS request
curl -X OPTIONS http://localhost:8080/api/blogs \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

### 3. Authenticated Request Test
```bash
# First login to get token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt \
  -v

# Then test authenticated endpoint
curl -X GET http://localhost:8080/api/cors-debug/test-auth \
  -H "Origin: http://localhost:3000" \
  -b cookies.txt \
  -v
```

## Production Deployment Checklist

- [ ] Update `allowedOrigins` array with production domains
- [ ] Set `NODE_ENV=production` in environment
- [ ] Ensure HTTPS is enabled on backend
- [ ] Update cookie settings for cross-site requests
- [ ] Test CORS from actual production frontend domain
- [ ] Monitor CORS violations in logs
- [ ] Set up alerts for repeated CORS violations
- [ ] Document allowed origins for team reference

## Common Issues and Solutions

### Issue: "No 'Access-Control-Allow-Origin' header is present"
- Verify origin is in allowed list
- Check for typos in origin URL
- Ensure protocol (http/https) matches exactly

### Issue: "CORS request did not succeed"
- Check if backend server is running
- Verify no network/firewall issues
- Ensure preflight request succeeds

### Issue: Cookies not being sent
- Verify `credentials: true` in CORS config
- Check `sameSite` cookie attribute
- Ensure HTTPS in production

### Issue: Preflight request fails
- Verify OPTIONS method is allowed
- Check all requested headers are in allowedHeaders
- Ensure maxAge is set for caching

## Monitoring Commands

Add these npm scripts to `package.json`:

```json
{
  "scripts": {
    "cors:test": "curl -X GET http://localhost:8080/api/cors-debug/test -H 'Origin: http://localhost:3000' -v",
    "cors:test-blocked": "curl -X GET http://localhost:8080/api/cors-debug/test -H 'Origin: http://blocked-site.com' -v",
    "cors:config": "curl -X GET http://localhost:8080/api/cors-debug/config -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'"
  }
}
```

This implementation provides a production-ready CORS configuration with comprehensive security, monitoring, and debugging capabilities.
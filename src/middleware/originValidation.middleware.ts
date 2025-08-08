import { Request, Response, NextFunction } from 'express';
import { corsAlertSystem } from '../utils/alertSystem';

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

export const validateOriginRequest = (req: Request, _res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const userAgent = req.headers['user-agent'];
  const isWarming = req.headers['x-warming-request'] === 'true';
  const isHealthCheck = req.path === '/api/health';
  
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
  // Also skip for explicit warming pings and health checks
  if (!origin || isWarming || isHealthCheck) {
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

      // Generate alert for suspicious origin patterns
      corsAlertSystem.generateAlert(
        'SUSPICIOUS',
        origin || 'unknown',
        req.ip || 'unknown',
        userAgent || 'unknown',
        {
          warnings: result.warnings,
          suspiciousPatterns: result.details.suspiciousPatterns,
          referer,
          path: req.path,
          method: req.method
        }
      );
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
  return (req: Request, res: Response, next: NextFunction): void => {
    const validation = (req as any).originValidation as OriginValidationResult;
    
    if (validation && validation.warnings.length >= maxWarnings) {
      console.error('🚨 Blocking suspicious origin request:', {
        origin: req.headers.origin,
        warnings: validation.warnings,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      // Generate alert for blocked request
      corsAlertSystem.generateAlert(
        'BLOCKED',
        req.headers.origin || 'unknown',
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        {
          warnings: validation.warnings,
          warningCount: validation.warnings.length,
          maxWarnings,
          path: req.path,
          method: req.method
        }
      );
      
      res.status(403).json({
        success: false,
        error: 'SUSPICIOUS_ORIGIN',
        message: 'Request blocked due to suspicious origin patterns'
      });
      return;
    }
    
    next();
  };
};
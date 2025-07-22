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

export const testCORSOrigin = (req: Request, res: Response): void => {
  const { testOrigin } = req.body;
  
  if (!testOrigin) {
    res.status(400).json({
      success: false,
      message: 'testOrigin is required in request body'
    });
    return;
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
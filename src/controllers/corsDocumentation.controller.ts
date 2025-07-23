import { Request, Response } from 'express';
import { allowedOrigins } from '../config/cors.config';

export const getCORSDocumentation = (_req: Request, res: Response) => {
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

export const getCORSSchema = (_req: Request, res: Response) => {
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
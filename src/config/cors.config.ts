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
    'X-File-Name',
    // Custom headers used by frontend warming services
    'X-Warming-Request',
    'X-Warming-Source'
  ],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  optionsSuccessStatus: 200, // Legacy browser support
  maxAge: 86400 // Cache preflight response for 24 hours
};

export { allowedOrigins };
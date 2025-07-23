import rateLimit from 'express-rate-limit';

export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

export const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests, please try again later'
);

export const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  'Too many upload attempts, please try again later'
);

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
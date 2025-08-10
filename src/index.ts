import express, { Application, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
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


// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import blogRoutes from './routes/blog.routes';
import commentRoutes from './routes/comment.routes';
import analyticsRoutes from './routes/analytics.routes';
import corsDebugRoutes from './routes/corsDebug.routes';
import uploadRoutes from './routes/upload.routes';
import originManagementRoutes from './routes/originManagement.routes';
import corsDocumentationRoutes from './routes/corsDocumentation.routes';
import { corsOptions } from './config/cors.config';
import { selfWarmingService } from './services/warmingService';
import { warmingMiddleware } from './middleware/warmingMiddleware';
import healthRoutes from './routes/health';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './utils/errors';
import { smartCORSLimiter } from './middleware/rateLimiter';
import { corsErrorHandler } from './middleware/corsError.middleware';
import { validateOriginRequest, blockSuspiciousOrigins } from './middleware/originValidation.middleware';
import { securityHeaders } from './middleware/security.middleware';


// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGODB_URI;
const USE_HTTPS = process.env.HTTPS === 'true';

// Security middleware
app.use(helmet());
app.use(compression());

// Apply security headers before CORS
app.use(securityHeaders);

// Smart CORS rate limiting
app.use((req, res, next) => {
  smartCORSLimiter(req, res);
  next();
});

// CORS configuration
app.use(cors(corsOptions));


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware (REQUIRED for httpOnly cookie auth)
app.use(cookieParser());

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Origin validation middleware
app.use(validateOriginRequest);
app.use(blockSuspiciousOrigins());

// Warming request tracking
app.use(warmingMiddleware.trackWarmingRequest);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cors-debug', corsDebugRoutes);
app.use('/api/admin/origins', originManagementRoutes);
app.use('/api/cors', corsDocumentationRoutes);

// Health routes (enhanced)
app.use('/api', healthRoutes);

// Handle 404 Not Found errors
app.use((_req: Request, _res: Response, next) => {
  next(new NotFoundError(`The requested URL ${_req.originalUrl} was not found on this server.`));
});

app.use(corsErrorHandler);

// Global error handler
app.use(errorHandler);



// Server function
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



// Connect to MongoDB and start the server
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

      // Start self-warming service shortly after server is ready
      setTimeout(() => {
        selfWarmingService.start();
      }, 5000);
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

startServer();

export default app;

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  selfWarmingService.stop();
  mongoose.connection
    .close()
    .then(() => process.exit(0))
    .catch(() => process.exit(0));
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', () => gracefulShutdown('Unhandled Rejection'));
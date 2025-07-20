import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
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
import { corsOptions } from './config/cors.config';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './utils/errors';
import { generalLimiter } from './middleware/rateLimiter';
import { corsErrorHandler } from './middleware/corsError.middleware';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGODB_URI;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
app.use(generalLimiter);

// CORS configuration
app.use(cors(corsOptions));


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'SecurityX Backend API is running!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

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
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

startServer();

export default app;
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { selfWarmingService } from '../services/warmingService';
import { warmingMiddleware } from '../middleware/warmingMiddleware';
import { dbWarmingService } from '../utils/dbWarming';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    const isWarmingRequest = req.headers['x-warming-request'] === 'true';
    const warmingSource = req.headers['x-warming-source'] as string;

    const healthData: any = {
      status: 'OK',
      message: 'SecurityX Backend API is running!',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
      mongoState: mongoose.connection.readyState,
    };

    if (isWarmingRequest) {
      healthData.warming = {
        source: warmingSource,
        requestTime: new Date().toISOString(),
        selfWarmingActive: selfWarmingService.isActive(),
        dbConnected: mongoose.connection.readyState === 1,
      };

      dbWarmingService.warmDatabase().catch(() => undefined);
    }

    res.status(200).json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/health/warming-stats', (_req: Request, res: Response) => {
  const selfWarmingStats = selfWarmingService.getStats();
  const middlewareStats = warmingMiddleware.getStats();
  res.status(200).json({
    selfWarming: selfWarmingStats,
    requestTracking: middlewareStats,
    timestamp: new Date().toISOString(),
  });
});

export default router;


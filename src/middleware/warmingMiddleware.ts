import { Request, Response, NextFunction } from 'express';

interface WarmingRequestStats {
  totalWarmingRequests: number;
  frontendRequests: number;
  selfWarmingRequests: number;
  lastWarmingRequest: Date | null;
  sources: Record<string, number>;
}

class WarmingMiddleware {
  private stats: WarmingRequestStats = {
    totalWarmingRequests: 0,
    frontendRequests: 0,
    selfWarmingRequests: 0,
    lastWarmingRequest: null,
    sources: {}
  };

  public trackWarmingRequest = (req: Request, res: Response, next: NextFunction): void => {
    const isWarmingRequest = req.headers['x-warming-request'] === 'true';

    if (isWarmingRequest) {
      this.stats.totalWarmingRequests += 1;
      this.stats.lastWarmingRequest = new Date();

      const source = (req.headers['x-warming-source'] as string) || 'unknown';
      this.stats.sources[source] = (this.stats.sources[source] || 0) + 1;

      if (source === 'frontend-service' || source === 'blog-prefetch') {
        this.stats.frontendRequests += 1;
      } else if (source === 'self-warming') {
        this.stats.selfWarmingRequests += 1;
      }

      res.setHeader('X-Warming-Response', 'true');
      res.setHeader('X-Warming-Time', new Date().toISOString());
      res.setHeader('X-Warming-Source-Echo', source);
    }

    next();
  };

  public getStats(): WarmingRequestStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      totalWarmingRequests: 0,
      frontendRequests: 0,
      selfWarmingRequests: 0,
      lastWarmingRequest: null,
      sources: {}
    };
  }
}

export const warmingMiddleware = new WarmingMiddleware();


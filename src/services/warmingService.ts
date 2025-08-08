interface WarmingConfig {
  enabled: boolean;
  interval: number; // milliseconds
  baseUrl: string | null;
  healthEndpoint: string;
  maxRetries: number;
  retryDelay: number;
}

interface WarmingStats {
  totalPings: number;
  successfulPings: number;
  lastPingTime: Date | null;
  lastSuccessTime: Date | null;
  currentStreak: number;
  isActive: boolean;
  startTime: Date;
}

export class SelfWarmingService {
  private config: WarmingConfig;
  private warmingInterval: NodeJS.Timeout | null = null;
  private stats: WarmingStats;

  constructor() {
    const envInterval = process.env.WARMING_INTERVAL ? parseInt(process.env.WARMING_INTERVAL, 10) : undefined;
    const enabledByEnv = process.env.WARMING_ENABLED === 'true';

    this.config = {
      enabled: enabledByEnv || process.env.NODE_ENV === 'production',
      interval: envInterval && !Number.isNaN(envInterval) ? envInterval : 14 * 60 * 1000,
      baseUrl: process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || null,
      healthEndpoint: '/api/health',
      maxRetries: 3,
      retryDelay: 30000
    };

    this.stats = {
      totalPings: 0,
      successfulPings: 0,
      lastPingTime: null,
      lastSuccessTime: null,
      currentStreak: 0,
      isActive: false,
      startTime: new Date()
    };
  }

  private async pingSelf(retryCount = 0): Promise<boolean> {
    if (!this.config.baseUrl) {
      return false;
    }

    try {
      const url = `${this.config.baseUrl}${this.config.healthEndpoint}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'X-Warming-Request': 'true',
          'X-Warming-Source': 'self-warming',
          'User-Agent': 'SecurityX-SelfWarming/1.0'
        }
      } as RequestInit);

      clearTimeout(timeoutId);

      if (response.ok) {
        // Force parse to ensure endpoint responds quickly
        await response.json().catch(() => undefined);

        this.stats.successfulPings += 1;
        this.stats.currentStreak += 1;
        this.stats.lastSuccessTime = new Date();
        return true;
      }

      throw new Error(`Unexpected status: ${response.status}`);
    } catch (_error) {
      this.stats.currentStreak = 0;

      if (retryCount < this.config.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
        return this.pingSelf(retryCount + 1);
      }

      return false;
    }
  }

  private async performSelfWarming(): Promise<void> {
    this.stats.totalPings += 1;
    this.stats.lastPingTime = new Date();
    await this.pingSelf();
  }

  public start(): void {
    if (!this.config.enabled) {
      return;
    }

    if (!this.config.baseUrl) {
      return;
    }

    if (this.warmingInterval) {
      return;
    }

    this.stats.isActive = true;

    // Delay first ping to allow server to fully start
    setTimeout(() => {
      this.performSelfWarming();
    }, 30000);

    this.warmingInterval = setInterval(() => {
      this.performSelfWarming();
    }, this.config.interval);
  }

  public stop(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
      this.stats.isActive = false;
    }
  }

  public getStats(): WarmingStats {
    return { ...this.stats };
  }

  public isActive(): boolean {
    return this.stats.isActive;
  }

  public async warmNow(): Promise<boolean> {
    return this.pingSelf();
  }
}

export const selfWarmingService = new SelfWarmingService();


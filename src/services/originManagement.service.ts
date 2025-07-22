import fs from 'fs/promises';
import path from 'path';

interface ManagedOrigin {
  id: string;
  url: string;
  environment: 'development' | 'staging' | 'production';
  description: string;
  addedBy: string;
  addedAt: string;
  lastUsed?: string;
  usageCount: number;
  isActive: boolean;
  tags: string[];
}

class OriginManagementService {
  private originsFilePath = path.join(process.cwd(), 'config', 'managed-origins.json');
  private origins: ManagedOrigin[] = [];

  async loadOrigins(): Promise<void> {
    try {
      const data = await fs.readFile(this.originsFilePath, 'utf-8');
      this.origins = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      this.origins = [];
      await this.saveOrigins();
    }
  }

  async saveOrigins(): Promise<void> {
    try {
      // Ensure config directory exists
      await fs.mkdir(path.dirname(this.originsFilePath), { recursive: true });
      await fs.writeFile(this.originsFilePath, JSON.stringify(this.origins, null, 2));
    } catch (error) {
      console.error('Failed to save origins configuration:', error);
    }
  }

  async addOrigin(originData: Omit<ManagedOrigin, 'id' | 'addedAt' | 'usageCount' | 'lastUsed'>): Promise<ManagedOrigin> {
    const newOrigin: ManagedOrigin = {
      ...originData,
      id: `origin_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      addedAt: new Date().toISOString(),
      usageCount: 0
    };

    this.origins.push(newOrigin);
    await this.saveOrigins();
    
    console.log(`✅ Added new origin: ${newOrigin.url} (${newOrigin.environment})`);
    return newOrigin;
  }

  async removeOrigin(originId: string): Promise<boolean> {
    const index = this.origins.findIndex(o => o.id === originId);
    if (index === -1) return false;

    const removedOrigin = this.origins.splice(index, 1)[0];
    await this.saveOrigins();
    
    console.log(`🗑️  Removed origin: ${removedOrigin.url}`);
    return true;
  }

  async updateOrigin(originId: string, updates: Partial<ManagedOrigin>): Promise<ManagedOrigin | null> {
    const origin = this.origins.find(o => o.id === originId);
    if (!origin) return null;

    Object.assign(origin, updates);
    await this.saveOrigins();
    
    console.log(`📝 Updated origin: ${origin.url}`);
    return origin;
  }

  async recordOriginUsage(originUrl: string): Promise<void> {
    const origin = this.origins.find(o => o.url === originUrl);
    if (origin) {
      origin.usageCount++;
      origin.lastUsed = new Date().toISOString();
      await this.saveOrigins();
    }
  }

  getActiveOrigins(environment?: string): string[] {
    return this.origins
      .filter(o => o.isActive && (!environment || o.environment === environment))
      .map(o => o.url);
  }

  getAllOrigins(): ManagedOrigin[] {
    return [...this.origins];
  }

  getOriginStats() {
    const total = this.origins.length;
    const active = this.origins.filter(o => o.isActive).length;
    const byEnvironment = {
      development: this.origins.filter(o => o.environment === 'development').length,
      staging: this.origins.filter(o => o.environment === 'staging').length,
      production: this.origins.filter(o => o.environment === 'production').length
    };

    return {
      total,
      active,
      inactive: total - active,
      byEnvironment,
      mostUsed: this.origins
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(o => ({ url: o.url, usageCount: o.usageCount }))
    };
  }
}

export const originManagementService = new OriginManagementService();

// Initialize on startup
originManagementService.loadOrigins().catch(console.error); 
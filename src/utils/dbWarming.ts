import mongoose from 'mongoose';

interface DbWarmingConfig {
  enabled: boolean;
  collections: string[];
  sampleSize: number;
}

export class DatabaseWarmingService {
  private config: DbWarmingConfig;

  constructor(config?: Partial<DbWarmingConfig>) {
    this.config = {
      enabled: true,
      collections: ['blogs', 'users'],
      sampleSize: 5,
      ...config
    };
  }

  public async warmDatabase(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const warmingPromises = this.config.collections.map(async (collectionName) => {
        try {
          const collection = mongoose.connection.collection(collectionName);
          const count = await collection.countDocuments();
          if (count > 0) {
            await collection.find({}).limit(this.config.sampleSize).toArray();
          }
          return { collection: collectionName, success: true, count };
        } catch (error) {
          return { collection: collectionName, success: false, error };
        }
      });

      await Promise.allSettled(warmingPromises);
    } catch (_error) {
      // non-fatal
    }
  }

  public async warmSpecificQueries(): Promise<void> {
    try {
      const warmingQueries = [
        mongoose.connection.collection('blogs').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
        mongoose.connection.collection('blogs').find({ status: 'published' }).limit(3).toArray(),
        mongoose.connection.collection('users').countDocuments(),
      ];
      await Promise.allSettled(warmingQueries);
    } catch (_error) {
      // non-fatal
    }
  }
}

export const dbWarmingService = new DatabaseWarmingService();


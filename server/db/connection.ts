import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectMongoDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set');

  try {
    await mongoose.connect(uri);
    logger.info('✅ MongoDB connected successfully');

    const { initializeGridFS } = await import('../utils/gridfsStorage');
    await initializeGridFS();
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

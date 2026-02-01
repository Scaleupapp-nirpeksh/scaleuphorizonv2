import mongoose from 'mongoose';
import { config } from '@/config';

/**
 * MongoDB connection options
 */
const connectionOptions: mongoose.ConnectOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 2,

  // Timeout settings
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,

  // Write concern
  w: 'majority',

  // Retry settings
  retryWrites: true,
};

/**
 * Connect to MongoDB
 */
export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(config.database.uri, connectionOptions);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Setup connection event handlers
 */
export const setupConnectionHandlers = (): void => {
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
  });

  // Handle application termination
  process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
  });
};

/**
 * Check if database is connected
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection stats
 */
export const getConnectionStats = async () => {
  if (!isDatabaseConnected()) {
    return null;
  }

  const admin = mongoose.connection.db?.admin();
  const serverStatus = await admin?.serverStatus();

  return {
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    readyState: mongoose.connection.readyState,
    connections: serverStatus?.connections,
  };
};

export default {
  connectDatabase,
  disconnectDatabase,
  setupConnectionHandlers,
  isDatabaseConnected,
  getConnectionStats,
};

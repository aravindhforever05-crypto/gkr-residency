import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gkr_residency',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const connectDB = async (): Promise<void> => {
  const client = await pool.connect();
  logger.info('PostgreSQL connected successfully');
  client.release();
};

export default pool;

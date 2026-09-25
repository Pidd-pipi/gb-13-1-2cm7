import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { AppDataSource } from './config/database';
import { redisService } from './services/redis.service';
import { minioService } from './services/minio.service';
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
  } catch (error) {
    console.warn('Database unavailable, server will start with limited API functionality:', error);
  }

  try {
    await redisService.connect();
  } catch (error) {
    console.warn('Redis unavailable, cache features disabled:', error);
  }

  try {
    await minioService.ensureBucket();
    console.log('MinIO bucket ensured');
  } catch (error) {
    console.warn('MinIO unavailable, upload features disabled:', error);
  }

  try {
    app.listen(config.app.port, () => {
      console.log(`Server running on port ${config.app.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

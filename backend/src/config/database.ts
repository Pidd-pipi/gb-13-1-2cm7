import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './index';
import { entities } from '../entities';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: true,
  logging: config.app.nodeEnv === 'development',
  entities: entities,
  migrations: [],
  subscribers: [],
});

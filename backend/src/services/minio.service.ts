import * as Minio from 'minio';
import { config } from '../config';

class MinioService {
  private client: Minio.Client;
  private bucket: string;

  constructor() {
    const url = new URL(config.minio.endPoint);
    this.client = new Minio.Client({
      endPoint: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 9000),
      useSSL: url.protocol === 'https:',
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
    this.bucket = config.minio.bucket;
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
    }
  }

  async uploadFile(buffer: Buffer, objectName: string, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
    const url = new URL(config.minio.endPoint);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}/${this.bucket}/${objectName}`;
  }

  async deleteFile(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectName);
  }
}

export const minioService = new MinioService();

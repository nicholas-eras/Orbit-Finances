import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import * as cookieParser from 'cookie-parser';

const server = express();

let cachedHandler;

async function bootstrap() {
  if (!cachedHandler) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    server.set('trust proxy', 1);

    app.use(cookieParser());

    app.enableCors({
      origin: process.env.ENVIRONMENT_FRONTEND ?? 'http://localhost:3001',
      credentials: true,
    });

    await app.init();

    cachedHandler = serverlessExpress({ app: server });
  }

  return cachedHandler;
}

export default async function handler(req, res) {
  const server = await bootstrap();
  return server(req, res);
}
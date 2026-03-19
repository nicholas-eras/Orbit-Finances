import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
const cookieParser = require('cookie-parser'); 

const expressApp = express();

let app;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );

    expressApp.set('trust proxy', 1);

    app.use(cookieParser());

    app.enableCors({
      origin: process.env.ENVIRONMENT_FRONTEND ?? 'http://localhost:3001',
      credentials: true,
    });

    await app.init();
  }

  return expressApp;
}

export default async function handler(req, res) {
  const server = await bootstrap();
  return server(req, res);
}
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
  });
  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 4000;
  const clientUrl = config.get<string>('app.clientUrl') ?? 'http://localhost:3000';

  // Configure WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  Logger.log(`🚀 API ready on http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`📡 WebSocket available at ws://localhost:${port}/notifications`, 'Bootstrap');
}
bootstrap();

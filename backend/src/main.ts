import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Serve static reports directory
  const express = require('express');
  const path = require('path');
  app.use('/reports', express.static(path.join(process.cwd(), 'reports')));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('JKKM Mess ERP API')
    .setDescription('Enterprise Hostel Mess Automation ERP - API Documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Products', 'Product catalog')
    .addTag('Inventory', 'Inventory management')
    .addTag('Suppliers', 'Supplier management')
    .addTag('Purchases', 'Purchase management')
    .addTag('Kitchen', 'Kitchen issue management')
    .addTag('Reports', 'Reports & analytics')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`\n🚀 JKKM Mess ERP Backend running on: http://localhost:${port}`);
  console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1] || 'connected'}`);
}
bootstrap();

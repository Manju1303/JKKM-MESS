import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as express from 'express';
import * as path from 'path';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // ── Security Headers (helmet) ─────────────────────────────────────────────
  // Sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://jkkm-mess.vercel.app',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, etc.)
      if (!origin) return callback(null, true);
      // Allow any Vercel preview deployment for this project
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Serve static reports directory ────────────────────────────────────────
  app.use('/reports', express.static(path.join(process.cwd(), 'reports')));

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strip unknown properties
      forbidNonWhitelisted: true, // Reject requests with unknown properties
      transform: true,         // Auto-transform types (string → number etc.)
    }),
  );

  // ── WebSocket ─────────────────────────────────────────────────────────────
  app.useWebSocketAdapter(new IoAdapter(app));

  // Always respect PORT env var — Railway injects PORT and routes traffic to it
  const port = parseInt(process.env.PORT || '') || 3001;

  const nodeEnv = (process.env.NODE_ENV || '').trim().replace(/^["']|["']$/g, '');
  if (nodeEnv !== 'production') {
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
    console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');
  console.log(`\n🚀 JKKM Mess ERP Backend running on port ${port}`);
  // SECURITY: Do not log full DATABASE_URL — it contains credentials
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'connected' : 'NOT CONFIGURED'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();


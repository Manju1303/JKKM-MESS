import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as dns from 'dns';

// SECURITY/CONNECTIVITY FIX: Override DNS lookup locally to bypass institutional DNS blocks on Neon DB and Upstash
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  const originalLookup = dns.lookup;
  (dns as any).lookup = function (hostname: string, options: any, callback: any) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return originalLookup(hostname, options, callback);
    }
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return originalLookup(hostname, options, callback);
      }
      if (options.all) {
        callback(null, addresses.map((addr) => ({ address: addr, family: 4 })));
      } else {
        callback(null, addresses[0], 4);
      }
    });
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  // ── Security Headers (helmet) ─────────────────────────────────────────────
  // Sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── Serve static reports directory ────────────────────────────────────────
  const express = require('express');
  const path = require('path');
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

  const port = process.env.NODE_ENV === 'production' ? 3000 : (process.env.PORT || 3001);

  // ── Swagger (DEVELOPMENT ONLY) ────────────────────────────────────────────
  // Never expose API docs in production — it reveals your entire API surface
  if (process.env.NODE_ENV !== 'production') {
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


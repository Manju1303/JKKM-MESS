import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps PrismaClient and manages DB lifecycle
 * with NestJS module hooks.
 */
function sanitizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const cleaned = url.trim().replace(/^["']|["']$/g, '');
  try {
    const parsedUrl = new URL(cleaned);
    parsedUrl.searchParams.delete('channel_binding');
    if (parsedUrl.hostname.includes('-pooler') && !parsedUrl.searchParams.has('pgbouncer')) {
      parsedUrl.searchParams.set('pgbouncer', 'true');
    }
    return parsedUrl.toString();
  } catch (err) {
    return cleaned;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const rawConnectionString = process.env.DATABASE_URL;
    const connectionString = sanitizeDatabaseUrl(rawConnectionString);
    super({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Prisma connected to PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

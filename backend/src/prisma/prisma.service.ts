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

  private keepAliveInterval: NodeJS.Timeout;

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Prisma connected to PostgreSQL');

    // Periodically query database to prevent Neon DB from suspending (cold-start latency)
    this.keepAliveInterval = setInterval(() => {
      this.$queryRaw`SELECT 1`
        .catch((err) => console.error('DB Keep-Alive ping failed:', err.message));
    }, 4 * 60 * 1000);

    if (this.keepAliveInterval && this.keepAliveInterval.unref) {
      this.keepAliveInterval.unref();
    }
  }

  async onModuleDestroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    await this.$disconnect();
  }
}

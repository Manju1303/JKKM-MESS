import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasesModule } from './purchases/purchases.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ConsumptionModule } from './consumption/consumption.module';
import { WastageModule } from './wastage/wastage.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    /**
     * SECURITY: Global rate limiting — 100 requests per 60s per IP.
     * Prevents brute-force on login, credential stuffing, and DoS attacks.
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // 60 seconds window
        limit: 100,   // max 100 requests per window per IP
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    SuppliersModule,
    InventoryModule,
    PurchasesModule,
    KitchenModule,
    ConsumptionModule,
    WastageModule,
    ReportsModule,
    NotificationsModule,
    AttendanceModule,
    AiModule,
    GatewayModule,
  ],
})
export class AppModule {}


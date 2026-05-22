import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasesModule } from './purchases/purchases.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ConsumptionModule } from './consumption/consumption.module';
import { WastageModule } from './wastage/wastage.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    NotificationsModule,
    ReportsModule,
    AttendanceModule,
    AiModule,
    GatewayModule,
  ],
})
export class AppModule {}

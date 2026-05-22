import { Module } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { KitchenController } from './kitchen.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [KitchenService],
  controllers: [KitchenController],
  exports: [KitchenService],
})
export class KitchenModule {}

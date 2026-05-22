import { Module } from '@nestjs/common';
import { WastageService } from './wastage.service';
import { WastageController } from './wastage.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [WastageService],
  controllers: [WastageController],
  exports: [WastageService],
})
export class WastageModule {}

import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get all inventory items with product details' })
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics for dashboard' })
  getStats() {
    return this.inventoryService.getStats();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get full dashboard data (stats + movements + alerts)' })
  getDashboard() {
    return this.inventoryService.getDashboardData();
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get items below minimum stock level' })
  getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Get('expiring-soon')
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Days ahead to look (default: 7)' })
  @ApiOperation({ summary: 'Get items expiring soon' })
  getExpiringSoon(@Query('days') days?: string) {
    return this.inventoryService.getExpiringSoon(days ? parseInt(days, 10) : 7);
  }

  @Get('movements')
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiOperation({ summary: 'Get stock movement history' })
  getMovements(@Query('productId') productId?: string) {
    return this.inventoryService.getMovements(productId ? parseInt(productId, 10) : undefined);
  }

  @Post()
  @Roles('Super Admin', 'Mess Manager', 'Storekeeper')
  @ApiOperation({ summary: 'Add stock to inventory (manual entry)' })
  addStock(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.addStock(dto);
  }
}

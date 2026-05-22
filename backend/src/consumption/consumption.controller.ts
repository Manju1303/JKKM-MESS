import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ConsumptionService } from './consumption.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('consumption')
export class ConsumptionController {
  constructor(private consumptionService: ConsumptionService) {}

  @Get()
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Get consumption logs' })
  getLogs(@Query('days') days?: string) {
    return this.consumptionService.getLogs(days ? parseInt(days, 10) : 30);
  }

  @Get('average')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Get average daily consumption per product' })
  getAverage(@Query('days') days?: string) {
    return this.consumptionService.getAverageConsumption(days ? parseInt(days, 10) : 30);
  }

  @Get('per-head')
  @ApiQuery({ name: 'meal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] })
  @ApiOperation({ summary: 'Get per-head consumption analysis' })
  getPerHead(@Query('meal') meal?: string) {
    return this.consumptionService.getPerHeadAnalysis(meal);
  }

  @Get('product/:productId')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Get consumption logs for a specific product' })
  getProductConsumption(
    @Query('productId') productId: string,
    @Query('days') days?: string,
  ) {
    return this.consumptionService.getProductConsumption(
      parseInt(productId, 10),
      days ? parseInt(days, 10) : 30,
    );
  }
}

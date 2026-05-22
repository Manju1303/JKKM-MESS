import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WastageService } from './wastage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wastage')
export class WastageController {
  constructor(private wastageService: WastageService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wastage records' })
  findAll() {
    return this.wastageService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get wastage statistics by reason' })
  getStats() {
    return this.wastageService.getStats();
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly wastage trend' })
  getMonthly() {
    return this.wastageService.getMonthlyWastage();
  }

  @Post()
  @ApiOperation({ summary: 'Report wastage' })
  create(@Body() data: any) {
    return this.wastageService.create(data);
  }
}

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WastageService } from './wastage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateWastageDto } from './dto/create-wastage.dto';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles('Super Admin', 'Mess Manager', 'Store Keeper', 'Kitchen Staff')
  @ApiOperation({ summary: 'Report wastage' })
  create(@Body() dto: CreateWastageDto) {
    return this.wastageService.create(dto);
  }
}


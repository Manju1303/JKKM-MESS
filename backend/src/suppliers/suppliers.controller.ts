import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers with order count' })
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier with recent purchase history' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.findById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get supplier spend statistics' })
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.getStats(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  create(@Body() data: any) {
    return this.suppliersService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier details' })
  update(@Param('id', ParseIntPipe) id: number, @Body() data: any) {
    return this.suppliersService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate supplier' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.deactivate(id);
  }
}

import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PartialType } from '@nestjs/swagger';

class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles('Super Admin', 'Mess Manager', 'Store Keeper')
  @ApiOperation({ summary: 'Create a new supplier' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Put(':id')
  @Roles('Super Admin', 'Mess Manager', 'Store Keeper')
  @ApiOperation({ summary: 'Update supplier details' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Mess Manager')
  @ApiOperation({ summary: 'Deactivate supplier' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.deactivate(id);
  }
}


import {
  Controller, Get, Post, Body, Param, ParseIntPipe, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  @Roles('Super Admin', 'Mess Manager', 'Storekeeper', 'Accountant')
  @ApiOperation({ summary: 'Get all purchase orders' })
  findAll() {
    return this.purchasesService.findAll();
  }

  @Get('pending')
  @Roles('Super Admin', 'Mess Manager', 'Accountant')
  @ApiOperation({ summary: 'Get purchases pending approval' })
  getPending() {
    return this.purchasesService.getPendingApprovals();
  }

  @Get('expenses/monthly')
  @Roles('Super Admin', 'Mess Manager', 'Storekeeper', 'Accountant')
  @ApiOperation({ summary: 'Monthly expense trend data for charts' })
  getMonthlyExpenses() {
    return this.purchasesService.getMonthlyExpenses();
  }

  @Get(':id')
  @Roles('Super Admin', 'Mess Manager', 'Storekeeper', 'Accountant')
  @ApiOperation({ summary: 'Get purchase order details' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.findById(id);
  }

  @Post()
  @Roles('Super Admin', 'Mess Manager', 'Storekeeper', 'Accountant')
  @ApiOperation({ summary: 'Create purchase order (status: PENDING)' })
  create(@Body() dto: CreatePurchaseDto, @Request() req: any) {
    return this.purchasesService.create(dto, req.user.userId);
  }


  @Post(':id/approve')
  @Roles('Super Admin', 'Mess Manager', 'Accountant')
  @ApiOperation({ summary: 'Approve purchase → auto-adds to inventory' })
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.purchasesService.approve(id, req.user.userId);
  }

  @Post(':id/reject')
  @Roles('Super Admin', 'Mess Manager', 'Accountant')
  @ApiOperation({ summary: 'Reject purchase order' })
  reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.purchasesService.reject(id, req.user.userId);
  }
}

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
  constructor(private purchasesService: PurchasesService) { }

  @Get()
  @Roles('SUPER_ADMIN', 'MESS_MANAGER', 'STORE_KEEPER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get all purchase orders' })
  findAll() {
    return this.purchasesService.findAll();
  }

  @Get('pending')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Get purchases pending approval' })
  getPending() {
    return this.purchasesService.getPendingApprovals();
  }

  @Get('auto-draft')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER', 'STORE_KEEPER')
  @ApiOperation({ summary: 'Generate AI recommended draft purchase order for stock deficits' })
  generateWeeklyDraft() {
    return this.purchasesService.generateDraftPO();
  }

  @Get('expenses/monthly')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Monthly expense trend data for charts' })
  getMonthlyExpenses() {
    return this.purchasesService.getMonthlyExpenses();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER', 'STORE_KEEPER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get purchase order details' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'MESS_MANAGER', 'STORE_KEEPER')
  @ApiOperation({ summary: 'Create purchase order (status: PENDING)' })
  create(@Body() dto: CreatePurchaseDto, @Request() req: any) {
    return this.purchasesService.create(dto, req.user.userId);
  }


  @Post(':id/approve')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Approve purchase → auto-adds to inventory' })
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.purchasesService.approve(id, req.user.userId);
  }

  @Post(':id/reject')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Reject purchase order' })
  reject(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.purchasesService.reject(id, req.user.userId);
  }
}

import { Controller, Get, Post, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateKitchenIssueDto } from './dto/create-kitchen-issue.dto';

@ApiTags('Kitchen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Post('issue')
  @Roles('Super Admin', 'Mess Manager', 'Kitchen Staff', 'Storekeeper')
  @ApiOperation({ summary: 'Issue stock from store to kitchen (auto-deducts inventory)' })
  issueStock(@Body() dto: CreateKitchenIssueDto, @Request() req: any) {
    return this.kitchenService.issueStock(dto, req.user.userId);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today\'s kitchen issues grouped by meal' })
  getTodayIssues() {
    return this.kitchenService.getTodayIssues();
  }

  @Get('history')
  @ApiQuery({ name: 'days', required: false, type: Number })
  @ApiOperation({ summary: 'Get issue history for last N days' })
  getHistory(@Query('days') days?: string) {
    return this.kitchenService.getIssueHistory(days ? parseInt(days, 10) : 30);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get 30-day consumption analytics' })
  getAnalytics() {
    return this.kitchenService.getConsumptionAnalytics();
  }

  @Get('meal-summary')
  @ApiQuery({ name: 'date', required: false, type: String, description: 'Date in YYYY-MM-DD format' })
  @ApiOperation({ summary: 'Get meal-wise summary for a specific date' })
  getMealSummary(@Query('date') date?: string) {
    return this.kitchenService.getMealSummary(date);
  }
}

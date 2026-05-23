import { Controller, Get, Post, Body, Request, UseGuards, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all generated reports' })
  getAll() {
    return this.reportsService.getAll();
  }

  @Post('daily')
  @ApiOperation({ summary: 'Generate daily report for a specific date' })
  generateDaily(@Body() body: { date: string }, @Request() req: any) {
    return this.reportsService.generateDailyReport(body.date, req.user.userId);
  }

  @Post('monthly')
  @ApiOperation({ summary: 'Generate monthly expense report' })
  generateMonthly(
    @Body() body: { year: number; month: number },
    @Request() req: any,
  ) {
    return this.reportsService.generateMonthlyReport(body.year, body.month, req.user.userId);
  }

  @Post('inventory')
  @ApiOperation({ summary: 'Generate inventory valuation report' })
  generateInventory(@Request() req: any) {
    return this.reportsService.generateInventoryReport(req.user.userId);
  }

  @Get('download/:filename')
  @Public()
  @ApiOperation({ summary: 'Download a generated report file' })
  downloadReport(@Param('filename') filename: string, @Res() res: any) {
    const filePath = path.join(process.cwd(), 'reports', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Report file not found');
    }
    res.download(filePath);
  }
}

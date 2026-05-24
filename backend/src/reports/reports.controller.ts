import {
  Controller, Get, Post, Body, Request, UseGuards,
  Param, Res, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GenerateDailyReportDto } from './dto/generate-daily-report.dto';
import { GenerateMonthlyReportDto } from './dto/generate-monthly-report.dto';
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
  @Roles('Super Admin', 'Mess Manager')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Generate daily report for a specific date' })
  generateDaily(@Body() dto: GenerateDailyReportDto, @Request() req: any) {
    return this.reportsService.generateDailyReport(dto.date, req.user.userId);
  }

  @Post('monthly')
  @Roles('Super Admin', 'Mess Manager')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Generate monthly expense report' })
  generateMonthly(
    @Body() dto: GenerateMonthlyReportDto,
    @Request() req: any,
  ) {
    return this.reportsService.generateMonthlyReport(dto.year, dto.month, req.user.userId);
  }

  @Post('inventory')
  @Roles('Super Admin', 'Mess Manager')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Generate inventory valuation report' })
  generateInventory(@Request() req: any) {
    return this.reportsService.generateInventoryReport(req.user.userId);
  }

  /**
   * SECURITY FIX: Filename is sanitized to prevent path traversal attacks.
   * - Strips any directory components (../, /, \)
   * - Only allows .xlsx extension
   * - Requires valid JWT authentication (removed @Public())
   */
  @Get('download/:filename')
  @ApiOperation({ summary: 'Download a generated report file (requires auth)' })
  downloadReport(@Param('filename') filename: string, @Res() res: any) {
    // Strip any path traversal characters — keep only the basename
    const sanitized = path.basename(filename);

    // Validate extension — only .xlsx files are served
    if (!sanitized.endsWith('.xlsx') || sanitized !== filename) {
      throw new BadRequestException('Invalid report filename');
    }

    // Ensure no null bytes or special characters remain
    if (/[^a-zA-Z0-9._-]/.test(sanitized)) {
      throw new BadRequestException('Invalid report filename');
    }

    const filePath = path.join(process.cwd(), 'reports', sanitized);

    // Verify the resolved path is inside the reports directory (defense-in-depth)
    const reportsDir = path.resolve(process.cwd(), 'reports');
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(reportsDir)) {
      throw new BadRequestException('Invalid report filename');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Report file not found');
    }

    res.download(filePath);
  }
}


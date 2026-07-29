import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Res,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GenerateDailyReportDto } from "./dto/generate-daily-report.dto";
import { GenerateMonthlyReportDto } from "./dto/generate-monthly-report.dto";

/**
 * ReportsController streams Excel files generated in-memory directly to the browser.
 * No files are written to disk — fully compatible with the container's ephemeral filesystem.
 */
@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: "Get all generated report records" })
  getAll() {
    return this.reportsService.getAll();
  }

  @Get("download/:id")
  @ApiOperation({ summary: "Download a generated report by ID" })
  async downloadReport(@Param("id", ParseIntPipe) id: number, @Res() res: any) {
    const { buffer, filename } = await this.reportsService.getReportFile(id);
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post("daily")
  @Roles("SUPER_ADMIN", "MESS_MANAGER")
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Generate and stream daily report for a specific date",
  })
  async generateDaily(
    @Body() dto: GenerateDailyReportDto,
    @Request() req: any,
    @Res() res: any,
  ) {
    const { buffer, filename } = await this.reportsService.generateDailyReport(
      dto.date,
      req.user.userId,
    );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post("monthly")
  @Roles("SUPER_ADMIN", "MESS_MANAGER")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Generate and stream monthly expense report" })
  async generateMonthly(
    @Body() dto: GenerateMonthlyReportDto,
    @Request() req: any,
    @Res() res: any,
  ) {
    const { buffer, filename } =
      await this.reportsService.generateMonthlyReport(
        dto.year,
        dto.month,
        req.user.userId,
      );
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Post("inventory")
  @Roles("SUPER_ADMIN", "MESS_MANAGER")
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: "Generate and stream inventory valuation report" })
  async generateInventory(@Request() req: any, @Res() res: any) {
    const { buffer, filename } =
      await this.reportsService.generateInventoryReport(req.user.userId);
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}

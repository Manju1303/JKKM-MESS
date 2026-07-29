import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { AiService } from "./ai.service";
import { AttendanceService } from "../attendance/attendance.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("Reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(
    private aiService: AiService,
    private attendanceService: AttendanceService,
  ) {}

  @Get("insights")
  @ApiOperation({ summary: "Get AI-powered insights summary for dashboard" })
  getInsights() {
    return this.aiService.getInsights();
  }

  @Get("predictions")
  @ApiOperation({ summary: "Get 7-day stock requirement predictions" })
  getPredictions() {
    return this.aiService.predictStockRequirement();
  }

  @Get("reorder-suggestions")
  @ApiOperation({
    summary: "Get smart reorder suggestions for low stock items",
  })
  getReorderSuggestions() {
    return this.aiService.getReorderSuggestions();
  }

  @Get("anomalies")
  @ApiOperation({ summary: "Detect unusual spending patterns" })
  getAnomalies() {
    return this.aiService.detectSpendingAnomalies();
  }

  @Get("per-student")
  @ApiOperation({ summary: "Get consumption per student metrics per product" })
  getPerStudentConsumption() {
    return this.aiService.getPerStudentConsumption();
  }

  @Get("forecast-by-attendance")
  @ApiOperation({
    summary:
      "Get predicted ingredient requirement. If headcount omitted, auto-reads from today's attendance.",
  })
  @ApiQuery({
    name: "headcount",
    required: false,
    type: Number,
    description:
      "Override student headcount (defaults to today's attendance total)",
  })
  async getAttendanceForecast(@Query("headcount") headcount?: string) {
    let count = headcount ? parseInt(headcount) : 0;
    if (!count) {
      count = await this.attendanceService.getTodayHeadcount();
      if (!count) count = 800; // sensible default if no attendance logged yet
    }
    return this.aiService.getAttendanceBasedForecasting(count);
  }

  @Get("stock-runout")
  @ApiOperation({ summary: "Get future stock runout predictions" })
  getStockRunout() {
    return this.aiService.getFutureStockPrediction();
  }

  @Get("seasonal")
  @ApiOperation({ summary: "Get seasonal and weekly consumption trends" })
  getSeasonalAnalysis() {
    return this.aiService.getSeasonalAnalysis();
  }

  @Get("waste")
  @ApiOperation({ summary: "Get waste reduction and efficiency analytics" })
  getWasteAnalytics() {
    return this.aiService.getWasteReductionAnalytics();
  }
}

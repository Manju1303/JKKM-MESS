import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { AttendanceService } from "./attendance.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";

@ApiTags("Kitchen")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("attendance")
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post("scan")
  @ApiOperation({
    summary: "Register student card barcode mobile scan for current meal",
  })
  registerScan(
    @Body("studentBarcode") studentBarcode: string,
    @Body("hostel") hostel?: string,
    @Request() req?: any,
  ) {
    const userAgent = req?.headers?.["user-agent"] || "Mobile Web Scanner";
    return this.attendanceService.registerScan(
      studentBarcode,
      hostel,
      userAgent,
    );
  }

  @Get()
  @ApiQuery({ name: "days", required: false, type: Number })
  @ApiOperation({ summary: "Get attendance records" })
  findAll(@Query("days") days?: string) {
    return this.attendanceService.findAll(days ? parseInt(days, 10) : 30);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get today attendance stats" })
  getStats() {
    return this.attendanceService.getStats();
  }

  @Get("weekly-trend")
  @ApiOperation({ summary: "Get 7-day attendance trend" })
  getWeeklyTrend() {
    return this.attendanceService.getWeeklyTrend();
  }

  @Post()
  @ApiOperation({ summary: "Record meal attendance" })
  create(@Body() dto: CreateAttendanceDto) {
    return this.attendanceService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update attendance record" })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(id, dto);
  }
}

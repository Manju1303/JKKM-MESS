import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { getTodayRangeIST } from "../common/date.utils";
import { AppGateway } from "../gateway/app.gateway";

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private appGateway: AppGateway,
  ) {}

  async findAll(days: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return this.prisma.attendance.findMany({
      where: { date: { gte: from } },
      orderBy: { date: "desc" },
    });
  }

  async create(dto: CreateAttendanceDto) {
    return this.prisma.attendance.create({
      data: {
        date: new Date(dto.date),
        meal: dto.meal,
        count: dto.count,
        hostel: dto.hostel,
        notes: dto.notes,
      },
    });
  }

  async update(id: number, dto: UpdateAttendanceDto) {
    const { date, ...rest } = dto;
    return this.prisma.attendance.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      },
    });
  }

  async getStats() {
    const { start, end } = getTodayRangeIST();
    const [todayRecords, avgResult] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { date: { gte: start, lt: end } },
      }),
      this.prisma.attendance.aggregate({ _avg: { count: true } }),
    ]);
    const todayTotal = todayRecords.reduce((s, r) => s + r.count, 0);
    return {
      todayTotal,
      averagePerMeal: Math.round(avgResult._avg.count || 0),
      breakdownToday: todayRecords,
    };
  }

  async getWeeklyTrend() {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const records = await this.prisma.attendance.findMany({
      where: { date: { gte: from } },
      orderBy: { date: "asc" },
    });
    return records;
  }

  /** Returns today's total student headcount — used by AI forecasting */
  async getTodayHeadcount(): Promise<number> {
    const { start, end } = getTodayRangeIST();
    const records = await this.prisma.attendance.findMany({
      where: { date: { gte: start, lt: end } },
    });
    return records.reduce((sum, r) => sum + r.count, 0);
  }

  getActiveMealSession(): { meal: string; notes: string } {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) {
      return { meal: "BREAKFAST", notes: "Mobile scan: Breakfast" };
    } else if (hour >= 11 && hour < 16) {
      return { meal: "LUNCH", notes: "Mobile scan: Lunch" };
    } else if (hour >= 16 && hour < 19) {
      return { meal: "SNACK", notes: "Mobile scan: Snack" };
    } else {
      return { meal: "DINNER", notes: "Mobile scan: Dinner" };
    }
  }

  async registerScan(
    studentBarcode: string,
    hostel: string = "All Hostels",
    deviceId?: string,
  ) {
    const { start, end } = getTodayRangeIST();
    const { meal, notes } = this.getActiveMealSession();

    // Check if double-scanning in current meal session
    const existingScan = await this.prisma.biometricScan.findFirst({
      where: {
        studentId: studentBarcode,
        mealType: meal,
        timestamp: {
          gte: start,
          lt: end,
        },
      },
    });

    if (existingScan) {
      throw new ConflictException(
        `This student card (${studentBarcode}) has already been scanned for ${meal} session today!`,
      );
    }

    // Save scan transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Create student ticket log
      await tx.biometricScan.create({
        data: {
          studentId: studentBarcode,
          mealType: meal,
          deviceId: deviceId || "Mobile Web Scanner",
        },
      });

      // 2. Find or create actual aggregated Meal Attendance count record
      let attendance = await tx.attendance.findFirst({
        where: {
          date: { gte: start, lt: end },
          meal,
          hostel,
        },
      });

      if (attendance) {
        attendance = await tx.attendance.update({
          where: { id: attendance.id },
          data: { count: attendance.count + 1 },
        });
      } else {
        attendance = await tx.attendance.create({
          data: {
            date: start, // Today start
            meal,
            count: 1,
            hostel,
            notes,
          },
        });
      }

      // 3. Emit real-time update over WebSockets
      try {
        this.appGateway.server.emit("attendance_update", {
          meal,
          studentId: studentBarcode,
          totalCount: attendance.count,
          date: start,
        });
      } catch (err) {
        console.error("Failed to emit WS attendance event:", err.message);
      }

      return {
        success: true,
        message: `Welcome! Entry scanning approved for ${meal}.`,
        studentId: studentBarcode,
        activeMeal: meal,
        totalCount: attendance.count,
      };
    });
  }
}

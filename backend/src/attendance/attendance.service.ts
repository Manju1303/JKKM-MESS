import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { getTodayRangeIST } from '../common/date.utils';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(days: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return this.prisma.attendance.findMany({
      where: { date: { gte: from } },
      orderBy: { date: 'desc' },
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
      orderBy: { date: 'asc' },
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
}

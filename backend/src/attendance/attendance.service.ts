import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async create(data: any) {
    return this.prisma.attendance.create({
      data: {
        date: new Date(data.date),
        meal: data.meal,
        count: data.count,
        hostel: data.hostel,
        notes: data.notes,
      },
    });
  }

  async update(id: number, data: any) {
    return this.prisma.attendance.update({ where: { id }, data });
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [todayRecords, avgResult] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { date: { gte: today, lt: tomorrow } },
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
}

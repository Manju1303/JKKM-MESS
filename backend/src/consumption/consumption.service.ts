import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConsumptionService {
  constructor(private prisma: PrismaService) {}

  async getLogs(days: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return this.prisma.consumptionLog.findMany({
      where: { date: { gte: from } },
      include: { dailyIssue: { include: { product: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getProductConsumption(productId: number, days: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return this.prisma.consumptionLog.findMany({
      where: { productId, date: { gte: from } },
      orderBy: { date: 'asc' },
    });
  }

  /** Compute average daily consumption per product over last N days */
  async getAverageConsumption(days: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    const logs = await this.prisma.consumptionLog.findMany({
      where: { date: { gte: from } },
      include: { dailyIssue: { include: { product: { select: { name: true, unit: true } } } } },
    });
    const grouped: Record<number, { name: string; unit: string; total: number; days: Set<string> }> = {};
    logs.forEach((l) => {
      if (!grouped[l.productId]) {
        grouped[l.productId] = {
          name: l.dailyIssue.product.name,
          unit: l.dailyIssue.product.unit,
          total: 0,
          days: new Set(),
        };
      }
      grouped[l.productId].total += l.quantity;
      grouped[l.productId].days.add(l.date.toDateString());
    });
    return Object.entries(grouped).map(([productId, data]) => ({
      productId: parseInt(productId),
      name: data.name,
      unit: data.unit,
      totalConsumed: Math.round(data.total * 100) / 100,
      activeDays: data.days.size,
      avgPerDay: Math.round((data.total / (data.days.size || 1)) * 100) / 100,
    }));
  }

  /** Per-head cost analysis */
  async getPerHeadAnalysis(meal?: string) {
    const where = meal ? { meal } : {};
    const logs = await this.prisma.consumptionLog.findMany({
      where: { ...where, headcount: { gt: 0 } },
      orderBy: { date: 'desc' },
      take: 100,
    });
    return logs.map((l) => ({
      date: l.date,
      meal: l.meal,
      headcount: l.headcount,
      quantity: l.quantity,
      unit: l.unit,
      perHead: l.perHeadUsage,
    }));
  }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private appGateway: AppGateway,
  ) {}

  /**
   * Issue stock from kitchen store:
   * 1. Create DailyIssue record
   * 2. Auto-deduct from Inventory (FIFO)
   * 3. Log into ConsumptionLog with headcount
   */
  async issueStock(data: any, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const issue = await tx.dailyIssue.create({
        data: {
          issueDate: new Date(data.issueDate),
          productId: data.productId,
          quantity: data.quantity,
          unit: data.unit,
          meal: data.meal,
          issuedById: userId,
          notes: data.notes,
        },
        include: { product: true },
      });

      const deduction = await this.inventoryService.deductStock(
        data.productId,
        data.quantity,
        `Kitchen issue - ${data.meal}`,
        tx,
      );

      if (deduction.remaining > 0) {
        throw new BadRequestException(
          `Insufficient stock for product. Needed ${data.quantity}, remaining unfulfilled: ${deduction.remaining}`,
        );
      }

      await tx.consumptionLog.create({
        data: {
          dailyIssueId: issue.id,
          date: new Date(data.issueDate),
          productId: data.productId,
          quantity: data.quantity,
          unit: data.unit,
          meal: data.meal,
          headcount: data.headcount || 0,
          perHeadUsage: data.headcount ? data.quantity / data.headcount : null,
        },
      });

      // Emit kitchen issue alert
      try {
        this.appGateway.emitKitchenIssue({
          productName: issue.product.name,
          quantity: issue.quantity,
          meal: issue.meal,
        });
      } catch (err) {
        console.error('Failed to broadcast kitchen issue alert:', err.message);
      }

      return issue;
    });
  }

  /** Get all issues for today grouped by meal */
  async getTodayIssues() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const issues = await this.prisma.dailyIssue.findMany({
      where: { issueDate: { gte: today, lt: tomorrow } },
      include: { product: true, issuedBy: { select: { name: true } } },
    });
    // Group by meal
    const grouped: Record<string, any[]> = {};
    issues.forEach((i) => {
      if (!grouped[i.meal]) grouped[i.meal] = [];
      grouped[i.meal].push(i);
    });
    return grouped;
  }

  async getIssueHistory(days: number = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    return this.prisma.dailyIssue.findMany({
      where: { issueDate: { gte: from } },
      include: { product: true, issuedBy: { select: { name: true } } },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getConsumptionAnalytics() {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return this.prisma.consumptionLog.findMany({
      where: { date: { gte: from } },
      include: { dailyIssue: { include: { product: true } } },
      orderBy: { date: 'asc' },
    });
  }

  /** Daily meal-wise consumption summary */
  async getMealSummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const logs = await this.prisma.consumptionLog.findMany({
      where: { date: { gte: targetDate, lt: nextDay } },
      include: { dailyIssue: { include: { product: true } } },
    });
    const summary = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((meal) => {
      const mealLogs = logs.filter((l) => l.meal === meal);
      const totalCost = mealLogs.reduce((sum, l) => {
        // cost approximation — real cost from last purchase
        return sum;
      }, 0);
      return { meal, items: mealLogs.length, totalHeadcount: mealLogs[0]?.headcount || 0 };
    });
    return summary;
  }
}

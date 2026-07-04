import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AppGateway } from '../gateway/app.gateway';
import { getTodayRangeIST } from '../common/date.utils';

@Injectable()
export class KitchenService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private appGateway: AppGateway,
  ) { }

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

  /** Get all issues for today */
  async getTodayIssues() {
    const { start, end } = getTodayRangeIST();
    const issues = await this.prisma.dailyIssue.findMany({
      where: { issueDate: { gte: start, lt: end } },
      include: {
        product: true,
        issuedBy: { select: { name: true } },
        consumptionLogs: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    return issues.map((i) => ({
      id: i.id,
      issueDate: i.issueDate,
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      unit: i.unit,
      meal: i.meal,
      issuedByName: i.issuedBy.name,
      headcount: i.consumptionLogs[0]?.headcount || 0,
      perHeadUsage: i.consumptionLogs[0]?.perHeadUsage || null,
      notes: i.notes,
    }));
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

  /**
   * Daily meal-wise consumption summary.
   * PERF FIX: Replaced N×2 parallel findFirst calls with 2 batch queries
   * using distinct + in-clause — reduces DB round-trips from O(N) to O(1).
   */
  async getMealSummary(date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const logs = await this.prisma.consumptionLog.findMany({
      where: { date: { gte: targetDate, lt: nextDay } },
      include: { dailyIssue: { include: { product: true } } },
    });

    const productIds = Array.from(new Set(logs.map((l) => l.productId)));
    const pricesMap = new Map<number, number>();

    if (productIds.length > 0) {
      // Single batch query: latest approved purchase price per product
      const purchaseItems = await this.prisma.purchaseItem.findMany({
        where: {
          productId: { in: productIds },
          purchase: { status: 'APPROVED' },
        },
        orderBy: { purchase: { purchaseDate: 'desc' } },
        distinct: ['productId'],
        select: { productId: true, unitPrice: true },
      });
      purchaseItems.forEach((pi) => pricesMap.set(pi.productId, pi.unitPrice));

      // Fallback: for products still missing a price, batch-fetch from inventory
      const missingIds = productIds.filter((id) => !pricesMap.has(id));
      if (missingIds.length > 0) {
        const invPrices = await this.prisma.inventory.findMany({
          where: { productId: { in: missingIds } },
          orderBy: { createdAt: 'desc' },
          distinct: ['productId'],
          select: { productId: true, costPerUnit: true },
        });
        invPrices.forEach((i) => {
          if (!pricesMap.has(i.productId)) pricesMap.set(i.productId, i.costPerUnit);
        });
      }
    }

    return ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'].map((meal) => {
      const mealLogs = logs.filter((l) => l.meal === meal);
      const totalCost = mealLogs.reduce((sum, l) => {
        const unitCost = pricesMap.get(l.productId) ?? 0;
        return sum + l.quantity * unitCost;
      }, 0);
      return {
        meal,
        items: mealLogs.length,
        totalHeadcount: mealLogs[0]?.headcount || 0,
        totalCost: Math.round(totalCost * 100) / 100,
      };
    });
  }

  async checkFefo(productId: number, batchNumber: string) {
    // Get all active inventory batches for this product
    const activeBatches = await this.prisma.inventory.findMany({
      where: { productId, isExpired: false, quantity: { gt: 0 } },
      orderBy: [
        { expiryDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' }
      ]
    });

    if (activeBatches.length <= 1) {
      return { matchesFefo: true };
    }

    const oldest = activeBatches[0];
    const current = activeBatches.find(b => b.batchNumber === batchNumber);

    // If the selected batch is not the oldest batch, return a warning flag
    if (current && oldest.id !== current.id && oldest.expiryDate && current.expiryDate && oldest.expiryDate < current.expiryDate) {
      const formattedDate = oldest.expiryDate.toLocaleDateString('en-IN');
      return {
        matchesFefo: false,
        warning: `FEFO Warning: There is an older batch (#${oldest.batchNumber || 'N/A'}) expiring earlier on ${formattedDate}. Please use that first to reduce food wastage.`,
        recommendedBatch: oldest.batchNumber,
        recommendedExpiry: oldest.expiryDate
      };
    }

    return { matchesFefo: true };
  }

  async getCostPerMealHistory(days: number = 7) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);

    const logs = await this.prisma.consumptionLog.findMany({
      where: { date: { gte: from } },
      include: { dailyIssue: { include: { product: true } } },
      orderBy: { date: 'asc' }
    });

    const productIds = Array.from(new Set(logs.map(l => l.productId)));
    const pricesMap = new Map<number, number>();

    if (productIds.length > 0) {
      const purchaseItems = await this.prisma.purchaseItem.findMany({
        where: {
          productId: { in: productIds },
          purchase: { status: 'APPROVED' }
        },
        orderBy: { purchase: { purchaseDate: 'desc' } },
        distinct: ['productId'],
        select: { productId: true, unitPrice: true }
      });
      purchaseItems.forEach(pi => pricesMap.set(pi.productId, pi.unitPrice));
    }

    const grouped: Record<string, {
      date: string;
      BreakfastCost: number; BreakfastHeadcount: number;
      LunchCost: number; LunchHeadcount: number;
      DinnerCost: number; DinnerHeadcount: number;
      SnackCost: number; SnackHeadcount: number;
    }> = {};

    logs.forEach(l => {
      const dateStr = l.date.toISOString().split('T')[0];
      if (!grouped[dateStr]) {
        grouped[dateStr] = {
          date: dateStr,
          BreakfastCost: 0, BreakfastHeadcount: 0,
          LunchCost: 0, LunchHeadcount: 0,
          DinnerCost: 0, DinnerHeadcount: 0,
          SnackCost: 0, SnackHeadcount: 0
        };
      }

      const mealKey = l.meal.toUpperCase();
      const unitCost = pricesMap.get(l.productId) ?? 0;
      const cost = l.quantity * unitCost;

      if (mealKey === 'BREAKFAST') {
        grouped[dateStr].BreakfastCost += cost;
        grouped[dateStr].BreakfastHeadcount = l.headcount || 0;
      } else if (mealKey === 'LUNCH') {
        grouped[dateStr].LunchCost += cost;
        grouped[dateStr].LunchHeadcount = l.headcount || 0;
      } else if (mealKey === 'DINNER') {
        grouped[dateStr].DinnerCost += cost;
        grouped[dateStr].DinnerHeadcount = l.headcount || 0;
      } else if (mealKey === 'SNACK') {
        grouped[dateStr].SnackCost += cost;
        grouped[dateStr].SnackHeadcount = l.headcount || 0;
      }
    });

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return Object.values(grouped).map(d => {
      const dateObj = new Date(d.date);
      const dayName = daysOfWeek[dateObj.getDay()];
      return {
        date: d.date,
        day: dayName,
        Breakfast: d.BreakfastHeadcount > 0 ? Math.round((d.BreakfastCost / d.BreakfastHeadcount) * 100) / 100 : 0,
        Lunch: d.LunchHeadcount > 0 ? Math.round((d.LunchCost / d.LunchHeadcount) * 100) / 100 : 0,
        Dinner: d.DinnerHeadcount > 0 ? Math.round((d.DinnerCost / d.DinnerHeadcount) * 100) / 100 : 0,
        Snack: d.SnackHeadcount > 0 ? Math.round((d.SnackCost / d.SnackHeadcount) * 100) / 100 : 0,
        totalDailyCost: Math.round((d.BreakfastCost + d.LunchCost + d.DinnerCost + d.SnackCost) * 100) / 100
      };
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AiService provides smart analytics and predictions based on historical data.
 * Uses statistical methods (moving averages, trend analysis) — no external AI API required.
 */
@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  /**
   * Predict next 7-day stock requirement per product
   * based on average consumption over last 30 days.
   */
  async predictStockRequirement() {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const logs = await this.prisma.consumptionLog.findMany({
      where: { date: { gte: from } },
      include: { dailyIssue: { include: { product: { select: { id: true, name: true, unit: true, minStockLevel: true } } } } },
    });

    const grouped: Record<number, { name: string; unit: string; min: number; quantities: number[] }> = {};
    logs.forEach((l) => {
      const p = l.dailyIssue.product;
      if (!grouped[p.id]) grouped[p.id] = { name: p.name, unit: p.unit, min: p.minStockLevel, quantities: [] };
      grouped[p.id].quantities.push(l.quantity);
    });

    return Object.entries(grouped).map(([productId, data]) => {
      const avg = data.quantities.reduce((s, q) => s + q, 0) / (data.quantities.length || 1);
      const predicted7Days = avg * 7;
      return {
        productId: parseInt(productId),
        productName: data.name,
        unit: data.unit,
        avgDailyUsage: Math.round(avg * 100) / 100,
        predicted7DayNeed: Math.round(predicted7Days * 100) / 100,
        recommendedOrderQty: Math.round(Math.max(predicted7Days * 1.2, data.min) * 100) / 100, // 20% buffer
      };
    });
  }

  /** Detect unusual spending patterns (anomaly detection via Z-score) */
  async detectSpendingAnomalies() {
    const purchases = await this.prisma.purchase.findMany({
      where: { status: 'APPROVED' },
      select: { purchaseNumber: true, netAmount: true, purchaseDate: true, supplierId: true },
      orderBy: { purchaseDate: 'desc' },
      take: 50,
    });
    if (purchases.length < 3) return [];
    const amounts = purchases.map((p) => p.netAmount);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = 2; // Z-score threshold
    return purchases
      .filter((p) => Math.abs(p.netAmount - mean) > threshold * stdDev)
      .map((p) => ({
        ...p,
        zScore: Math.round(((p.netAmount - mean) / stdDev) * 100) / 100,
        isHigh: p.netAmount > mean,
      }));
  }

  /** Smart reorder suggestions based on low stock + predicted usage */
  async getReorderSuggestions() {
    const inventory = await this.prisma.inventory.findMany({
      include: { product: true },
    });

    const lowStock = inventory.filter((i) => i.quantity <= i.product.minStockLevel);
    const predictions = await this.predictStockRequirement();
    const predMap = new Map(predictions.map((p) => [p.productId, p]));

    return lowStock.map((inv) => {
      const pred = predMap.get(inv.productId);
      return {
        productId: inv.productId,
        productName: inv.product.name,
        currentStock: inv.quantity,
        minRequired: inv.product.minStockLevel,
        unit: inv.product.unit,
        suggestedOrderQty: pred?.recommendedOrderQty || inv.product.minStockLevel * 2,
        urgency: inv.quantity === 0 ? 'CRITICAL' : inv.quantity < inv.product.minStockLevel / 2 ? 'HIGH' : 'MEDIUM',
      };
    });
  }

  /** Generate insights summary for dashboard AI panel */
  async getInsights() {
    const [reorderSuggestions, anomalies, predictions] = await Promise.all([
      this.getReorderSuggestions(),
      this.detectSpendingAnomalies(),
      this.predictStockRequirement(),
    ]);

    return {
      summary: {
        criticalItems: reorderSuggestions.filter((r) => r.urgency === 'CRITICAL').length,
        highUrgencyItems: reorderSuggestions.filter((r) => r.urgency === 'HIGH').length,
        spendingAnomalies: anomalies.length,
        topConsumerProduct: predictions.sort((a, b) => b.avgDailyUsage - a.avgDailyUsage)[0]?.productName || 'N/A',
      },
      reorderSuggestions: reorderSuggestions.slice(0, 5),
      anomalies: anomalies.slice(0, 5),
      predictions: predictions.slice(0, 10),
    };
  }
}

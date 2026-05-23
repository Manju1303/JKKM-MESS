import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class WastageService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  async findAll() {
    return this.prisma.wastage.findMany({
      include: { product: true },
      orderBy: { reportedAt: 'desc' },
    });
  }

  async create(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const deduction = await this.inventoryService.deductStock(
        data.productId,
        data.quantity,
        `Wastage - ${data.reason}`,
        tx,
      );

      if (deduction.remaining > 0) {
        throw new BadRequestException(
          `Insufficient stock to log wastage of ${data.quantity} units. Unfulfilled: ${deduction.remaining}`,
        );
      }

      const calculatedValue = deduction.affectedBatches.reduce(
        (sum, batch) => sum + batch.quantity * batch.costPerUnit,
        0,
      );

      const wastage = await tx.wastage.create({
        data: {
          productId: data.productId,
          quantity: data.quantity,
          unit: data.unit,
          reason: data.reason,
          valueAmount: Math.round(calculatedValue * 100) / 100,
          reportedAt: new Date(data.reportedAt),
          notes: data.notes,
        },
        include: { product: true },
      });

      return wastage;
    });
  }

  async getStats() {
    const wastages = await this.prisma.wastage.findMany();
    const totalValue = wastages.reduce((sum, w) => sum + w.valueAmount, 0);
    const byReason = wastages.reduce((acc, w) => {
      acc[w.reason] = (acc[w.reason] || 0) + w.valueAmount;
      return acc;
    }, {} as Record<string, number>);
    return {
      totalWastageValue: Math.round(totalValue * 100) / 100,
      totalEntries: wastages.length,
      byReason,
    };
  }

  async getMonthlyWastage() {
    const wastages = await this.prisma.wastage.findMany({
      select: { reportedAt: true, valueAmount: true, reason: true },
      orderBy: { reportedAt: 'asc' },
    });
    const grouped: Record<string, number> = {};
    wastages.forEach((w) => {
      const key = `${w.reportedAt.getFullYear()}-${String(w.reportedAt.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + w.valueAmount;
    });
    return Object.entries(grouped).map(([month, value]) => ({ month, value }));
  }
}

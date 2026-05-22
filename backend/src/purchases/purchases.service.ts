import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private appGateway: AppGateway,
  ) {}

  async findAll() {
    return this.prisma.purchase.findMany({
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
    });
  }

  /** Create a purchase order (status: PENDING) */
  async create(data: any, userId: number) {
    const purchaseNumber = `PO-${Date.now()}`;
    const purchase = await this.prisma.purchase.create({
      data: {
        purchaseNumber,
        supplierId: data.supplierId,
        purchaseDate: new Date(data.purchaseDate),
        totalAmount: data.totalAmount,
        gstAmount: data.gstAmount || 0,
        netAmount: data.netAmount,
        billNumber: data.billNumber,
        notes: data.notes,
        createdById: userId,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            gstPercent: item.gstPercent || 0,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    // Notify managers about new purchase order
    try {
      this.appGateway.emitNewPurchase({
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        supplierId: purchase.supplierId,
        amount: purchase.netAmount,
      });
    } catch (err) {
      console.error('Failed to broadcast new purchase alert:', err.message);
    }

    return purchase;
  }

  /**
   * Approve a purchase → automatically adds each line item to inventory.
   * This is the key business automation: one approval triggers stock updates.
   */
  async approve(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
        include: { items: { include: { product: true } } },
      });
      for (const item of purchase.items) {
        await this.inventoryService.addStock({
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          costPerUnit: item.unitPrice,
          batchNumber: item.batchNumber ?? undefined,
          expiryDate: item.expiryDate?.toISOString(),
        }, tx);
      }
      return purchase;
    });
  }

  async reject(id: number, userId: number) {
    return this.prisma.purchase.update({
      where: { id },
      data: { status: 'REJECTED', approvedBy: userId, approvedAt: new Date() },
    });
  }

  /** Returns monthly expense data for trend charts */
  async getMonthlyExpenses() {
    const purchases = await this.prisma.purchase.findMany({
      where: { status: 'APPROVED' },
      select: { purchaseDate: true, netAmount: true },
      orderBy: { purchaseDate: 'asc' },
    });
    const grouped: Record<string, number> = {};
    purchases.forEach((p) => {
      const key = `${p.purchaseDate.getFullYear()}-${String(p.purchaseDate.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + p.netAmount;
    });
    return Object.entries(grouped).map(([month, amount]) => ({
      month,
      amount: Math.round(amount * 100) / 100,
    }));
  }

  async getPendingApprovals() {
    return this.prisma.purchase.findMany({
      where: { status: 'PENDING' },
      include: { supplier: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

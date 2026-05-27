import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { AppGateway } from '../gateway/app.gateway';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private appGateway: AppGateway,
    private emailService: EmailService,
  ) {}

  async findAll() {
    return this.prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Returns items where aggregate current quantity <= minStockLevel */
  async getLowStock() {
    const stockSums = await this.prisma.inventory.groupBy({
      by: ['productId'],
      where: { isExpired: false, quantity: { gt: 0 } },
      _sum: { quantity: true },
    });

    const stockMap = new Map<number, number>(
      stockSums.map((s) => [s.productId, s._sum.quantity ?? 0])
    );

    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
    });

    const lowStockProducts = products.filter((prod) => {
      const currentStock = stockMap.get(prod.id) ?? 0;
      return currentStock <= prod.minStockLevel;
    });

    return lowStockProducts.map((prod) => ({
      id: prod.id,
      productId: prod.id,
      quantity: stockMap.get(prod.id) ?? 0,
      unit: prod.unit,
      costPerUnit: 0,
      product: prod,
      createdAt: prod.createdAt,
      updatedAt: prod.updatedAt,
    }));
  }

  /** Returns items expiring within `days` days */
  async getExpiringSoon(days: number = 7) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.prisma.inventory.findMany({
      where: {
        expiryDate: { lte: future, gte: new Date() },
        isExpired: false,
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  /** Aggregate inventory statistics for dashboard */
  async getStats() {
    const [totalItems, lowStock, expiringSoon] = await Promise.all([
      this.prisma.inventory.count(),
      this.getLowStock(),
      this.getExpiringSoon(7),
    ]);
    const valueResult = await this.prisma.inventory.findMany({
      select: { quantity: true, costPerUnit: true },
    });
    const totalInventoryValue = valueResult.reduce(
      (sum, i) => sum + i.quantity * i.costPerUnit,
      0,
    );
    return {
      totalItems,
      lowStockCount: lowStock.length,
      expiringSoonCount: expiringSoon.length,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    };
  }

  /** Add stock entry and record IN movement */
  async addStock(dto: CreateInventoryDto, tx?: any) {
    const client = tx || this.prisma;
    const inventory = await client.inventory.create({
      data: {
        productId: dto.productId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        unit: dto.unit,
        costPerUnit: dto.costPerUnit,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        manufacturingDate: dto.manufacturingDate ? new Date(dto.manufacturingDate) : undefined,
        location: dto.location || 'Main Store',
      },
      include: { product: true },
    });
    await client.stockMovement.create({
      data: {
        inventoryId: inventory.id,
        type: 'IN',
        quantity: dto.quantity,
        reason: 'Purchase received',
      },
    });
    return inventory;
  }

  /**
   * FEFO stock deduction across batches (with FIFO fallback).
   * Returns { deducted, remaining, affectedBatches } where remaining > 0 means insufficient stock.
   */
  async deductStock(productId: number, quantity: number, reason: string, tx?: any) {
    const client = tx || this.prisma;
    const inventories = await client.inventory.findMany({
      where: { productId, isExpired: false, quantity: { gt: 0 } },
      orderBy: [
        { expiryDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
    });
    let remaining = quantity;
    const affectedBatches: { id: number; quantity: number; costPerUnit: number }[] = [];

    for (const inv of inventories) {
      if (remaining <= 0) break;
      const deduct = Math.min(inv.quantity, remaining);
      await client.inventory.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity - deduct },
      });
      await client.stockMovement.create({
        data: { inventoryId: inv.id, type: 'OUT', quantity: deduct, reason },
      });
      affectedBatches.push({
        id: inv.id,
        quantity: deduct,
        costPerUnit: inv.costPerUnit,
      });
      remaining -= deduct;
    }

    // Dynamic warning trigger: check if updated quantity falls below threshold and emit WS event
    try {
      const product = await client.product.findUnique({
        where: { id: productId },
      });
      if (product) {
        const activeStock = await client.inventory.aggregate({
          where: { productId, isExpired: false, quantity: { gt: 0 } },
          _sum: { quantity: true },
        });
        const currentQty = activeStock._sum.quantity || 0;
        if (currentQty <= product.minStockLevel) {
          this.appGateway.emitLowStockAlert({
            productId,
            productName: product.name,
            currentQty,
            minLevel: product.minStockLevel,
          });
          // Non-blocking email alert
          this.emailService.sendLowStockAlert(
            product.name,
            currentQty,
            product.minStockLevel,
            product.unit,
          ).catch(() => {});
        }
      }
    } catch (err) {
      // Don't break database transaction if WS notification fails
      console.error('Failed to broadcast low stock alert:', err.message);
    }

    return { deducted: quantity - remaining, remaining, affectedBatches };
  }

  async getMovements(productId?: number) {
    return this.prisma.stockMovement.findMany({
      where: productId ? { inventory: { productId } } : {},
      include: { inventory: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getDashboardData() {
    const [stats, recentMovements, lowStock, expiringSoon] = await Promise.all([
      this.getStats(),
      this.getMovements(),
      this.getLowStock(),
      this.getExpiringSoon(7),
    ]);
    return {
      stats,
      recentMovements: recentMovements.slice(0, 10),
      lowStock,
      expiringSoon,
    };
  }
}

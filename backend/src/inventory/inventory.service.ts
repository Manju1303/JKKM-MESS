import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Returns items where current quantity <= minStockLevel */
  async getLowStock() {
    const inventories = await this.prisma.inventory.findMany({
      include: { product: true },
    });
    return inventories.filter((inv) => inv.quantity <= inv.product.minStockLevel);
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
  async addStock(dto: CreateInventoryDto) {
    const inventory = await this.prisma.inventory.create({
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
    await this.prisma.stockMovement.create({
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
   * FIFO stock deduction across batches.
   * Returns { deducted, remaining } where remaining > 0 means insufficient stock.
   */
  async deductStock(productId: number, quantity: number, reason: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { productId, isExpired: false, quantity: { gt: 0 } },
      orderBy: { createdAt: 'asc' }, // FIFO
    });
    let remaining = quantity;
    for (const inv of inventories) {
      if (remaining <= 0) break;
      const deduct = Math.min(inv.quantity, remaining);
      await this.prisma.inventory.update({
        where: { id: inv.id },
        data: { quantity: inv.quantity - deduct },
      });
      await this.prisma.stockMovement.create({
        data: { inventoryId: inv.id, type: 'OUT', quantity: deduct, reason },
      });
      remaining -= deduct;
    }
    return { deducted: quantity - remaining, remaining };
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

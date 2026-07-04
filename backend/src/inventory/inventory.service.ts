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
  ) { }

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

  /** Returns items expiring within `days` days and auto-alerts the dashboard/notification center */
  async getExpiringSoon(days: number = 7) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const expiringItems = await this.prisma.inventory.findMany({
      where: {
        expiryDate: { lte: future, gte: new Date() },
        isExpired: false,
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });

    // Auto-create expiry warning persistent notifications
    for (const item of expiringItems) {
      const formattedDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : 'N/A';
      const msg = `Batch ${item.batchNumber || 'N/A'} of product ${item.product.name} will expire on ${formattedDate}.`;

      const exists = await this.prisma.notification.findFirst({
        where: {
          type: 'EXPIRY',
          message: { contains: formattedDate },
          title: { contains: item.product.name },
        },
      });

      if (!exists) {
        await this.prisma.notification.create({
          data: {
            title: `Expiry Alert: ${item.product.name}`,
            message: msg,
            type: 'EXPIRY',
            severity: 'WARNING',
            isRead: false,
          },
        }).catch(() => { });
      }
    }

    return expiringItems;
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
      include: { product: true },
      orderBy: [
        { expiryDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
    });

    const totalStockBefore = inventories.reduce((sum, inv) => sum + inv.quantity, 0);
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

    const deductedAmount = quantity - remaining;
    const currentQty = totalStockBefore - deductedAmount;

    // Get product from fetched inventories if available
    let product = inventories[0]?.product;
    if (!product) {
      // Fallback: fetch product details if no inventory was found
      try {
        product = await client.product.findUnique({
          where: { id: productId },
        });
      } catch (err) {
        console.error('Failed to fetch product details fallback:', err.message);
      }
    }

    // Dynamic warning trigger: check if updated quantity falls below threshold and emit WS event
    if (product && currentQty <= product.minStockLevel) {
      try {
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
        ).catch(() => { });

        // Persistent database notification
        await client.notification.create({
          data: {
            title: `Low Stock: ${product.name}`,
            message: `Product ${product.name} is below safety stock level. Current quantity: ${currentQty} ${product.unit} (minimum threshold: ${product.minStockLevel} ${product.unit}).`,
            type: 'LOW_STOCK',
            severity: 'CRITICAL',
            isRead: false,
          },
        }).catch(() => { });
      } catch (err) {
        console.error('Failed to broadcast low stock alert:', err.message);
      }
    }

    return { deducted: deductedAmount, remaining, affectedBatches };
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

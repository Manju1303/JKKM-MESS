import { Injectable, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { AppGateway } from "../gateway/app.gateway";
import { EmailService } from "../notifications/email.service";

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private appGateway: AppGateway,
    private emailService: EmailService,
  ) {}

  async findAll() {
    return this.prisma.purchase.findMany({
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
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
    // Collision-safe: timestamp + 5-char random base-36 suffix
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const purchaseNumber = `PO-${Date.now()}-${suffix}`;
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

    // Notify managers about new purchase order (WebSocket + Email)
    try {
      this.appGateway.emitNewPurchase({
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        supplierId: purchase.supplierId,
        amount: purchase.netAmount,
      });
    } catch (err) {
      console.error("Failed to broadcast new purchase alert:", err.message);
    }

    // Non-blocking email alert to admin
    const supplierName =
      (purchase as any).supplier?.name || `Supplier #${purchase.supplierId}`;
    this.emailService
      .sendNewPurchaseAlert(
        purchase.purchaseNumber,
        supplierName,
        purchase.netAmount,
      )
      .catch(() => {});

    // Write persistent notification to database
    await this.prisma.notification
      .create({
        data: {
          title: "New Purchase Order",
          message: `Purchase order ${purchase.purchaseNumber} has been created for ${supplierName} for amount INR ${purchase.netAmount.toFixed(2)}. Pending approval.`,
          type: "PURCHASE",
          severity: "INFO",
          isRead: false,
        },
      })
      .catch(() => {});

    return purchase;
  }

  /**
   * Approve a purchase → automatically adds each line item to inventory.
   * SECURITY FIX: Uses where: { id, status: 'PENDING' } to prevent double-approval
   * race conditions that would add duplicate stock entries.
   */
  async approve(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Only update if still PENDING — prevents double-approval / double stock injection
      const purchase = await tx.purchase
        .update({
          where: { id, status: "PENDING" },
          data: {
            status: "APPROVED",
            approvedBy: userId,
            approvedAt: new Date(),
          },
          include: { items: { include: { product: true } } },
        })
        .catch(() => null);

      if (!purchase) {
        throw new ConflictException(
          "Purchase order is not in PENDING status or does not exist. Cannot approve.",
        );
      }

      for (const item of purchase.items) {
        await this.inventoryService.addStock(
          {
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            costPerUnit: item.unitPrice,
            batchNumber: item.batchNumber ?? undefined,
            expiryDate: item.expiryDate?.toISOString(),
          },
          tx,
        );
      }

      // Write persistent notification to database
      await tx.notification
        .create({
          data: {
            title: "Purchase Approved",
            message: `Purchase order ${purchase.purchaseNumber} has been approved. Line items have been auto-added to inventory.`,
            type: "PURCHASE",
            severity: "INFO",
            isRead: false,
          },
        })
        .catch(() => {});

      return purchase;
    });
  }

  async reject(id: number, userId: number) {
    const purchase = await this.prisma.purchase
      .update({
        where: { id, status: "PENDING" },
        data: {
          status: "REJECTED",
          approvedBy: userId,
          approvedAt: new Date(),
        },
      })
      .catch(() => null);

    if (!purchase) {
      throw new ConflictException(
        "Purchase order is not in PENDING status or does not exist. Cannot reject.",
      );
    }

    // Write persistent notification to database
    await this.prisma.notification
      .create({
        data: {
          title: "Purchase Rejected",
          message: `Purchase order ${purchase.purchaseNumber} was rejected.`,
          type: "PURCHASE",
          severity: "WARNING",
          isRead: false,
        },
      })
      .catch(() => {});

    return purchase;
  }

  /** Returns monthly expense data for trend charts */
  async getMonthlyExpenses() {
    const purchases = await this.prisma.purchase.findMany({
      where: { status: "APPROVED" },
      select: { purchaseDate: true, netAmount: true },
      orderBy: { purchaseDate: "asc" },
    });
    const grouped: Record<string, number> = {};
    purchases.forEach((p) => {
      const key = `${p.purchaseDate.getFullYear()}-${String(p.purchaseDate.getMonth() + 1).padStart(2, "0")}`;
      grouped[key] = (grouped[key] || 0) + p.netAmount;
    });
    return Object.entries(grouped).map(([month, amount]) => ({
      month,
      amount: Math.round(amount * 100) / 100,
    }));
  }

  async getPendingApprovals() {
    return this.prisma.purchase.findMany({
      where: { status: "PENDING" },
      include: { supplier: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async generateDraftPO() {
    // Get all active products
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
    });

    const stockSums = await this.prisma.inventory.groupBy({
      by: ["productId"],
      where: { isExpired: false, quantity: { gt: 0 } },
      _sum: { quantity: true },
    });

    const stockMap = new Map<number, number>(
      stockSums.map((s) => [s.productId, s._sum.quantity ?? 0]),
    );

    // Find items below stock limit
    const deficitItems = products.filter((p) => {
      const current = stockMap.get(p.id) ?? 0;
      return current < p.minStockLevel;
    });

    if (deficitItems.length === 0) {
      return {
        message: "All items are well stocked! No draft PO needed.",
        items: [],
      };
    }

    // Find default supplier for categories or just select first active supplier
    const suppliers = await this.prisma.supplier.findMany({
      where: { isActive: true },
      take: 1,
    });
    const defaultSupplierId = suppliers[0]?.id || 1;

    // Map deficit items to purchase order line items mock
    const draftItems = deficitItems.map((p) => {
      const current = stockMap.get(p.id) ?? 0;
      const deficit = p.minStockLevel - current;
      // Add a 20% safe buffer to deficit
      const orderQty = Math.ceil(deficit * 1.2);
      const suggestedPrice = 100; // default placeholder price

      return {
        productId: p.id,
        productName: p.name,
        category: p.category.name,
        unit: p.unit,
        currentStock: current,
        minRequired: p.minStockLevel,
        suggestedPurchaseQty: orderQty,
        suggestedPrice: suggestedPrice,
        totalPrice: orderQty * suggestedPrice,
      };
    });

    const totalAmount = draftItems.reduce((s, item) => s + item.totalPrice, 0);

    return {
      supplierId: defaultSupplierId,
      items: draftItems,
      totalAmount: totalAmount,
      gstAmount: Math.round(totalAmount * 0.05 * 100) / 100, // 5% average GST
      netAmount: Math.round(totalAmount * 1.05 * 100) / 100,
      notes: "AI Auto-Draft PO: Restocking safety levels.",
    };
  }
}

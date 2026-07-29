import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supplier.findMany({
      include: { _count: { select: { purchases: true } } },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { items: { include: { product: true } } },
        },
      },
    });
    if (!supplier) throw new NotFoundException("Supplier not found");
    return supplier;
  }

  async create(data: any) {
    return this.prisma.supplier.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async deactivate(id: number) {
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Compute spend and order count per supplier */
  async getStats(id: number) {
    const purchases = await this.prisma.purchase.findMany({
      where: { supplierId: id },
      select: { totalAmount: true, purchaseDate: true, status: true },
    });
    const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const approvedOrders = purchases.filter(
      (p) => p.status === "APPROVED",
    ).length;
    return {
      totalOrders: purchases.length,
      approvedOrders,
      totalSpend: Math.round(totalSpend * 100) / 100,
    };
  }
}

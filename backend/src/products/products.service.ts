import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(type?: string) {
    return this.prisma.product.findMany({
      where: { isActive: true, ...(type ? { type } : {}) },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByBarcode(barcode: string) {
    const product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { category: true },
    });
    if (!product) throw new NotFoundException(`Product not found for barcode: ${barcode}`);
    return product;
  }

  async findById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventories: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: dto,
      include: { category: true },
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true },
    });
  }

  async delete(id: number) {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(data: { name: string; type: string; description?: string }) {
    return this.prisma.category.create({ data });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

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

  /**
   * Find product by barcode field.
   * Also attempts lookup by product code as fallback (supports manual entry).
   */
  async findByBarcode(barcode: string) {
    // Primary: exact barcode match
    let product = await this.prisma.product.findUnique({
      where: { barcode },
      include: { category: true },
    });
    // Fallback: treat input as product code (manual entry use-case)
    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { code: barcode },
        include: { category: true },
      });
    }
    if (!product) throw new NotFoundException(`No product found for barcode/code: "${barcode}"`);
    return product;
  }

  /** Find product by product code (e.g. SKU) */
  async findByCode(code: string) {
    const product = await this.prisma.product.findUnique({
      where: { code },
      include: { category: true },
    });
    if (!product) throw new NotFoundException(`No product found for code: "${code}"`);
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

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }
}

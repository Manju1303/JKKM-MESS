import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.menu.findMany({
      orderBy: { date: 'desc' },
    });
  }

  async findByDateRange(start: string, end: string) {
    return this.prisma.menu.findMany({
      where: {
        date: {
          gte: new Date(start),
          lte: new Date(end),
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException('Menu item not found');
    return menu;
  }

  async create(dto: CreateMenuDto) {
    return this.prisma.menu.create({
      data: {
        date: new Date(dto.date),
        meal: dto.meal.toUpperCase(),
        items: dto.items,
        notes: dto.notes,
      },
    });
  }

  async update(id: number, dto: Partial<CreateMenuDto>) {
    await this.findOne(id);
    return this.prisma.menu.update({
      where: { id },
      data: {
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.meal && { meal: dto.meal.toUpperCase() }),
        ...(dto.items && { items: dto.items }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.menu.delete({ where: { id } });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      include: { role: true },
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('User not found');
    // Strip password from response
    const { password, ...rest } = user;
    return rest;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async create(data: any) {
    return this.prisma.user.create({
      data,
      include: { role: true },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: { role: true },
    });
  }

  async updateLastLogin(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  async deactivate(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }
}

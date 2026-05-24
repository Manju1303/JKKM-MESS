import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoginActivityService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.loginActivity.findMany({
      orderBy: { timestamp: 'desc' },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.loginActivity.findMany({
      where: {
        email: {
          contains: email,
          mode: 'insensitive',
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}

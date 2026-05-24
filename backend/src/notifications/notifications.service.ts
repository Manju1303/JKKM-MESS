import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType = 'LOW_STOCK' | 'EXPIRY' | 'PURCHASE' | 'SYSTEM';
export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: number) {
    return this.prisma.notification.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnread(userId?: number) {
    return this.prisma.notification.findMany({
      where: { isRead: false, OR: [{ userId: null }, { userId }] },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    title: string,
    message: string,
    type: NotificationType,
    severity: NotificationSeverity = 'INFO',
    userId?: number,
  ) {
    return this.prisma.notification.create({
      data: { title, message, type, severity, userId },
    });
  }

  async markRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, OR: [{ userId: null }, { userId }] },
      data: { isRead: true },
    });
  }

  async markAllRead(userId?: number) {
    return this.prisma.notification.updateMany({
      where: { isRead: false, OR: [{ userId: null }, { userId }] },
      data: { isRead: true },
    });
  }

  async getCount(userId?: number) {
    const unread = await this.prisma.notification.count({
      where: { isRead: false, OR: [{ userId: null }, { userId }] },
    });
    return { unread };
  }

  /** Called by background jobs to create system alerts */
  async createSystemAlert(title: string, message: string, severity: NotificationSeverity = 'WARNING') {
    return this.create(title, message, 'SYSTEM', severity);
  }
}

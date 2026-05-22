import { Controller, Get, Post, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  findAll(@Request() req: any) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  getUnread(@Request() req: any) {
    return this.notificationsService.getUnread(req.user.userId);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getCount(@Request() req: any) {
    return this.notificationsService.getCount(req.user.userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markRead(id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.userId);
  }
}

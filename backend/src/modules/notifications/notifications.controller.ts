import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get notifications for a wallet address' })
  @ApiResponse({ status: 200, description: 'Notifications returned' })
  async findByWallet(
    @Query('walletAddress') walletAddress: string,
    @Query('limit') limit?: number,
  ) {
    if (!walletAddress) return { notifications: [] };
    const notifications = await this.notificationsService.findByWallet(
      walletAddress,
      limit ? Number(limit) : 50,
    );
    return { notifications };
  }

  @Public()
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Query('walletAddress') walletAddress: string) {
    if (!walletAddress) return { count: 0 };
    const count = await this.notificationsService.getUnreadCount(walletAddress);
    return { count };
  }

  @Public()
  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string) {
    await this.notificationsService.markRead(id);
    return { success: true };
  }

  @Public()
  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read for a wallet' })
  async markAllRead(@Body() body: { walletAddress: string }) {
    await this.notificationsService.markAllRead(body.walletAddress);
    return { success: true };
  }
}

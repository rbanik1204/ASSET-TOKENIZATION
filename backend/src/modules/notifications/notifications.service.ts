import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  /** Create a notification for a wallet */
  async create(data: {
    walletAddress: string;
    type: string;
    title: string;
    message: string;
    txId?: string;
    network?: string;
    actionUrl?: string;
  }): Promise<Notification> {
    const notif = this.notifRepo.create({
      walletAddress: data.walletAddress,
      type: data.type,
      title: data.title,
      message: data.message,
      txId: data.txId || null,
      network: data.network || 'testnet',
      actionUrl: data.actionUrl || null,
      read: false,
    });
    const saved = await this.notifRepo.save(notif);
    this.logger.log(`Notification [${data.type}] created for ${data.walletAddress.slice(0, 8)}... — ${data.title}`);
    return saved;
  }

  /** Get all notifications for a wallet (newest first) */
  async findByWallet(walletAddress: string, limit = 50): Promise<Notification[]> {
    return this.notifRepo.find({
      where: { walletAddress },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /** Mark a notification as read */
  async markRead(id: string): Promise<void> {
    await this.notifRepo.update(id, { read: true });
  }

  /** Mark all as read for a wallet */
  async markAllRead(walletAddress: string): Promise<void> {
    await this.notifRepo.update({ walletAddress, read: false }, { read: true });
  }

  /** Get unread count */
  async getUnreadCount(walletAddress: string): Promise<number> {
    return this.notifRepo.count({ where: { walletAddress, read: false } });
  }
}

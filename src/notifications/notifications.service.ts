import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from '@entities/notification.entity';
import { User } from '@entities/user.entity';
import { NotificationType, UserRole } from '@lib/common/enums';
import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly gateway: NotificationsGateway,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: dto.userId,
      senderId: dto.senderId ?? null,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data ?? null,
    });
    const saved = await this.notificationRepo.save(notification);
    this.gateway.emitToUser(dto.userId, saved);
    return saved;
  }

  async createSystemAnnouncement(
    senderId: string,
    dto: { title: string; message: string; target: 'all' | 'landlord' | 'tenant' },
  ): Promise<void> {
    const roleMap: Record<string, UserRole[]> = {
      all: [UserRole.LANDLORD, UserRole.TENANT],
      landlord: [UserRole.LANDLORD],
      tenant: [UserRole.TENANT],
    };

    const users = await this.userRepo.find({
      where: { role: In(roleMap[dto.target]), isActive: true },
      select: { id: true },
    });

    if (!users.length) return;

    const notifications = users.map((user) =>
      this.notificationRepo.create({
        userId: user.id,
        senderId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: dto.title,
        message: dto.message,
        data: null,
      }),
    );

    const saved = await this.notificationRepo.save(notifications);
    saved.forEach((n) => this.gateway.emitToUser(n.userId, n));

    this.logger.log(
      `Broadcast system_announcement to ${saved.length} users (target: ${dto.target})`,
    );
  }

  async findAll(
    userId: string,
    dto: GetNotificationsDto,
  ): Promise<{ items: Notification[]; hasMore: boolean }> {
    const limit = dto.limit ?? 20;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });

    if (dto.isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead: dto.isRead });
    }

    if (dto.lastCreatedAt) {
      qb.andWhere('n.createdAt < :lastCreatedAt', {
        lastCreatedAt: new Date(dto.lastCreatedAt),
      });
    }

    qb.orderBy('n.createdAt', 'DESC').take(limit + 1);

    const items = await qb.getMany();
    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    return { items, hasMore };
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    if (!notification.isRead) {
      await this.notificationRepo.update(id, {
        isRead: true,
        readAt: new Date(),
      });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = false', { userId })
      .execute();
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}

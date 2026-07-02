import { User } from '@entities/user.entity';
import { DEFAULT_TIMEZONE } from '@lib/common/constants/app.constant';
import { ROLE_PAGE_LINKS } from '@lib/common/constants/page-links.constant';
import { UserRole } from '@lib/common/enums';
import { DateUtils } from '@lib/utils/date.util';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../../src/apis/admin/users/users.service';
import { DashboardService } from '../../../src/apis/admin/dashboard/dashboard.service';
import { AdminPropertiesService } from '../../../src/apis/admin/properties/properties.service';
import { ENV } from '@lib/configs/env.config';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

@Injectable()
export class ToolAIService {
  private readonly logger = new Logger(ToolAIService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly dashboardService: DashboardService,
    private readonly adminPropertiesService: AdminPropertiesService,
  ) {}

  async handleFunctionCall(
    functionName: string,
    args: Record<string, any>,
    user: User,
  ) {
    switch (functionName) {
      case this.getCurrentDate.name: {
        return this.getCurrentDate(args.timezone);
      }

      case this.getFrontendPageLink.name: {
        return this.getFrontendPageLink(args.topic, user.role);
      }

      case this.getSystemOverview.name: {
        this.assertAdmin(user);
        return this.getSystemOverview();
      }

      case this.searchUsers.name: {
        this.assertAdmin(user);
        return this.searchUsers(args);
      }

      case this.getUserDetail.name: {
        this.assertAdmin(user);
        return this.getUserDetail(args.userId);
      }

      case this.listProperties.name: {
        this.assertAdmin(user);
        return this.listProperties(args);
      }

      default:
        throw new Error(`Unknown function call: ${functionName}`);
    }
  }

  private assertAdmin(user: User) {
    if (!ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Không có quyền sử dụng chức năng này');
    }
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  getCurrentDate(timezone = DEFAULT_TIMEZONE): string {
    return DateUtils.getCurrentDateInTimezone(timezone).toISOString();
  }

  getFrontendPageLink(topic: string, role: UserRole) {
    const page = ROLE_PAGE_LINKS[role]?.[topic];
    if (!page) {
      return {
        found: false,
        message: `Không có trang tương ứng với "${topic}" cho vai trò hiện tại`,
      };
    }
    return {
      found: true,
      path: page.path,
      label: page.label,
      feUrl: ENV.frontendUrl,
    };
  }

  async getSystemOverview() {
    return this.dashboardService.getStats();
  }

  async searchUsers(args: {
    search?: string;
    role?: UserRole;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const result = await this.usersService.findAll({
      search: args.search,
      role: args.role,
      isActive: args.isActive,
      page: args.page ?? 1,
      limit: args.limit ?? 20,
    } as any);

    return { ...result, items: result.items.map((u) => this.sanitizeUser(u)) };
  }

  async getUserDetail(userId: string) {
    const user = await this.usersService.findOne(userId);
    return this.sanitizeUser(user);
  }

  async listProperties(args: {
    search?: string;
    landlordId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.adminPropertiesService.findAll({
      search: args.search,
      landlordId: args.landlordId,
      page: args.page ?? 1,
      limit: args.limit ?? 20,
    } as any);
  }
}

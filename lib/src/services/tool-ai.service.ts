import { User } from '@entities/user.entity';
import { DEFAULT_TIMEZONE } from '@lib/common/constants/app.constant';
import { ROLE_PAGE_LINKS } from '@lib/common/constants/page-links.constant';
import {
  ContractStatus,
  Gender,
  InvoiceStatus,
  PaymentMethod,
  PaymentSource,
  RoomStatus,
  RoomType,
  UserRole,
} from '@lib/common/enums';
import { DateUtils } from '@lib/utils/date.util';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UsersService } from '../../../src/apis/admin/users/users.service';
import { CreateUserDto } from '../../../src/apis/admin/users/dto/create-user.dto';
import { UpdateUserDto } from '../../../src/apis/admin/users/dto/update-user.dto';
import { DashboardService } from '../../../src/apis/admin/dashboard/dashboard.service';
import { AdminPropertiesService } from '../../../src/apis/admin/properties/properties.service';
import { DashboardService as LandlordDashboardService } from '../../../src/apis/landlord/dashboard/dashboard.service';
import { PropertiesService as LandlordPropertiesService } from '../../../src/apis/landlord/properties/properties.service';
import { RoomsService } from '../../../src/apis/landlord/rooms/rooms.service';
import { TenantsService } from '../../../src/apis/landlord/tenants/tenants.service';
import { ContractsService } from '../../../src/apis/landlord/contracts/contracts.service';
import { InvoicesService } from '../../../src/apis/landlord/invoices/invoices.service';
import { CreateInvoiceDto } from '../../../src/apis/landlord/invoices/dto/create-invoice.dto';
import { PaymentsService } from '../../../src/apis/landlord/payments/payments.service';
import { CreatePaymentDto } from '../../../src/apis/landlord/payments/dto/create-payment.dto';
import { VehiclesService } from '../../../src/apis/landlord/vehicles/vehicles.service';
import { MeterReadingsService } from '../../../src/apis/landlord/meter-readings/meter-readings.service';
import { CreateMeterReadingDto } from '../../../src/apis/landlord/meter-readings/dto/create-meter-reading.dto';
import { UpdateMeterReadingDto } from '../../../src/apis/landlord/meter-readings/dto/update-meter-reading.dto';
import { DashboardService as TenantDashboardService } from '../../../src/apis/tenant/dashboard/dashboard.service';
import { RoomService as TenantRoomService } from '../../../src/apis/tenant/room/room.service';
import { ContractsService as TenantContractsService } from '../../../src/apis/tenant/contracts/contracts.service';
import { InvoicesService as TenantInvoicesService } from '../../../src/apis/tenant/invoices/invoices.service';
import { PaymentsService as TenantPaymentsService } from '../../../src/apis/tenant/payments/payments.service';
import { VehiclesService as TenantVehiclesService } from '../../../src/apis/tenant/vehicles/vehicles.service';
import { NotificationsService } from '../../../src/notifications/notifications.service';
import { ENV } from '@lib/configs/env.config';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

@Injectable()
export class ToolAIService {
  constructor(
    private readonly usersService: UsersService,
    private readonly dashboardService: DashboardService,
    private readonly adminPropertiesService: AdminPropertiesService,
    private readonly landlordDashboardService: LandlordDashboardService,
    private readonly landlordPropertiesService: LandlordPropertiesService,
    private readonly roomsService: RoomsService,
    private readonly tenantsService: TenantsService,
    private readonly contractsService: ContractsService,
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly meterReadingsService: MeterReadingsService,
    private readonly tenantDashboardService: TenantDashboardService,
    private readonly tenantRoomService: TenantRoomService,
    private readonly tenantContractsService: TenantContractsService,
    private readonly tenantInvoicesService: TenantInvoicesService,
    private readonly tenantPaymentsService: TenantPaymentsService,
    private readonly tenantVehiclesService: TenantVehiclesService,
    private readonly notificationsService: NotificationsService,
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

      case this.broadcastSystemNotification.name: {
        this.assertAdmin(user);
        return this.broadcastSystemNotification(args, user);
      }

      case this.createLandlordAccount.name: {
        this.assertAdmin(user);
        return this.createLandlordAccount(args, user);
      }

      case this.toggleLandlordActive.name: {
        this.assertAdmin(user);
        return this.toggleLandlordActive(args, user);
      }

      case this.resetLandlordPassword.name: {
        this.assertAdmin(user);
        return this.resetLandlordPassword(args, user);
      }

      case this.getLandlordDashboard.name: {
        this.assertLandlord(user);
        return this.getLandlordDashboard(user);
      }

      case this.searchProperties.name: {
        this.assertLandlord(user);
        return this.searchProperties(args, user);
      }

      case this.searchRooms.name: {
        this.assertLandlord(user);
        return this.searchRooms(args, user);
      }

      case this.getRoomDetail.name: {
        this.assertLandlord(user);
        return this.getRoomDetail(args.roomId, user);
      }

      case this.searchTenants.name: {
        this.assertLandlord(user);
        return this.searchTenants(args, user);
      }

      case this.getTenantDetail.name: {
        this.assertLandlord(user);
        return this.getTenantDetail(args.tenantId, user);
      }

      case this.toggleTenantActive.name: {
        this.assertLandlord(user);
        return this.toggleTenantActive(args, user);
      }

      case this.resetTenantPassword.name: {
        this.assertLandlord(user);
        return this.resetTenantPassword(args, user);
      }

      case this.searchContracts.name: {
        this.assertLandlord(user);
        return this.searchContracts(args, user);
      }

      case this.getContractDetail.name: {
        this.assertLandlord(user);
        return this.getContractDetail(args.contractId, user);
      }

      case this.searchInvoices.name: {
        this.assertLandlord(user);
        return this.searchInvoices(args, user);
      }

      case this.getInvoiceDetail.name: {
        this.assertLandlord(user);
        return this.getInvoiceDetail(args.invoiceId, user);
      }

      case this.searchPayments.name: {
        this.assertLandlord(user);
        return this.searchPayments(args, user);
      }

      case this.searchVehicles.name: {
        this.assertLandlord(user);
        return this.searchVehicles(args, user);
      }

      case this.searchMeterReadings.name: {
        this.assertLandlord(user);
        return this.searchMeterReadings(args, user);
      }

      case this.getMeterReadingDetail.name: {
        this.assertLandlord(user);
        return this.getMeterReadingDetail(args.meterReadingId, user);
      }

      case this.createInvoiceForContract.name: {
        this.assertLandlord(user);
        return this.createInvoiceForContract(args, user);
      }

      case this.createMeterReading.name: {
        this.assertLandlord(user);
        return this.createMeterReading(args, user);
      }

      case this.updateMeterReading.name: {
        this.assertLandlord(user);
        return this.updateMeterReading(args, user);
      }

      case this.cancelInvoice.name: {
        this.assertLandlord(user);
        return this.cancelInvoice(args, user);
      }

      case this.recordPayment.name: {
        this.assertLandlord(user);
        return this.recordPayment(args, user);
      }

      case this.getTenantDashboard.name: {
        this.assertTenant(user);
        return this.getTenantDashboard(user);
      }

      case this.getMyRoom.name: {
        this.assertTenant(user);
        return this.getMyRoom(user);
      }

      case this.getMyContracts.name: {
        this.assertTenant(user);
        return this.getMyContracts(args, user);
      }

      case this.getMyContractDetail.name: {
        this.assertTenant(user);
        return this.getMyContractDetail(args.contractId, user);
      }

      case this.getMyInvoices.name: {
        this.assertTenant(user);
        return this.getMyInvoices(args, user);
      }

      case this.getMyInvoiceDetail.name: {
        this.assertTenant(user);
        return this.getMyInvoiceDetail(args.invoiceId, user);
      }

      case this.getMyPayments.name: {
        this.assertTenant(user);
        return this.getMyPayments(args, user);
      }

      case this.getMyPaymentDetail.name: {
        this.assertTenant(user);
        return this.getMyPaymentDetail(args.paymentId, user);
      }

      case this.getMyVehicles.name: {
        this.assertTenant(user);
        return this.getMyVehicles(user);
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

  private assertLandlord(user: User) {
    if (user.role !== UserRole.LANDLORD) {
      throw new ForbiddenException('Không có quyền sử dụng chức năng này');
    }
  }

  private assertTenant(user: User) {
    if (user.role !== UserRole.TENANT) {
      throw new ForbiddenException('Không có quyền sử dụng chức năng này');
    }
  }

  // Các tool ghi/sửa bỏ qua ValidationPipe (gọi thẳng service, không qua controller/DTO
  // pipeline HTTP) — validate lại thủ công bằng đúng DTO của endpoint tương ứng để giữ
  // nguyên các ràng buộc nghiệp vụ (định dạng SĐT/email, tuổi tối thiểu, định dạng kỳ...).
  private async validateDto<T extends object>(
    cls: new () => T,
    plain: Record<string, any>,
  ): Promise<T> {
    const instance = plainToInstance(cls, plain);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));
      throw new BadRequestException(
        messages.length ? messages : 'Dữ liệu không hợp lệ',
      );
    }
    return instance;
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

  async broadcastSystemNotification(
    args: {
      title?: string;
      message?: string;
      target?: 'all' | 'landlord' | 'tenant';
      confirm?: boolean;
    },
    user: User,
  ) {
    if (!args.title || !args.message || !args.target) {
      throw new ForbiddenException(
        'Cần đủ title, message, target để gửi thông báo',
      );
    }
    if (args.confirm !== true) {
      return {
        sent: false,
        message:
          'Chưa gửi. Hãy xác nhận lại nội dung với người dùng trước, sau đó gọi lại với confirm=true để gửi thông báo.',
      };
    }

    await this.notificationsService.createSystemAnnouncement(user.id, {
      title: args.title,
      message: args.message,
      target: args.target,
    });

    return { sent: true };
  }

  async createLandlordAccount(
    args: {
      fullName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: Gender;
      confirm?: boolean;
    },
    user: User,
  ) {
    if (!args.fullName || !args.email || !args.phone) {
      throw new BadRequestException(
        'Cần đủ họ tên, email, số điện thoại để tạo tài khoản chủ trọ',
      );
    }

    const dto = await this.validateDto(CreateUserDto, {
      fullName: args.fullName,
      email: args.email,
      phone: args.phone,
      role: UserRole.LANDLORD,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
    });

    if (args.confirm !== true) {
      return {
        created: false,
        preview: dto,
        message:
          'Chưa tạo. Hãy xác nhận lại thông tin với người dùng, sau đó gọi lại với confirm=true để tạo tài khoản.',
      };
    }

    const created = await this.usersService.create(dto, user);
    return { created: true, user: this.sanitizeUser(created) };
  }

  async toggleLandlordActive(
    args: { userId?: string; confirm?: boolean },
    user: User,
  ) {
    if (!args.userId) {
      throw new BadRequestException('Cần userId của chủ trọ cần khóa/mở khóa');
    }

    const target = await this.usersService.findOne(args.userId);
    if (target.role !== UserRole.LANDLORD) {
      throw new ForbiddenException('Chỉ áp dụng cho tài khoản chủ trọ');
    }

    if (args.confirm !== true) {
      return {
        toggled: false,
        current: this.sanitizeUser(target),
        willChangeTo: !target.isActive,
        message: `Chưa thực hiện. Xác nhận với người dùng muốn ${
          target.isActive ? 'khóa' : 'mở khóa'
        } tài khoản "${target.fullName}", sau đó gọi lại với confirm=true.`,
      };
    }

    const updated = await this.usersService.toggleActive(args.userId, user);
    return { toggled: true, user: this.sanitizeUser(updated) };
  }

  async resetLandlordPassword(
    args: { userId?: string; confirm?: boolean },
    user: User,
  ) {
    if (!args.userId) {
      throw new BadRequestException(
        'Cần userId của chủ trọ cần cấp lại mật khẩu',
      );
    }

    const target = await this.usersService.findOne(args.userId);
    if (target.role !== UserRole.LANDLORD) {
      throw new ForbiddenException('Chỉ áp dụng cho tài khoản chủ trọ');
    }

    if (args.confirm !== true) {
      return {
        reset: false,
        target: this.sanitizeUser(target),
        message: `Chưa thực hiện. Xác nhận với người dùng muốn cấp lại mật khẩu cho "${target.fullName}" (${target.email}) — mật khẩu mới sẽ được gửi tự động qua email, sau đó gọi lại với confirm=true.`,
      };
    }

    const dto = await this.validateDto(UpdateUserDto, {
      isResetPassword: true,
    });
    await this.usersService.update(args.userId, dto, user);
    return { reset: true, email: target.email };
  }

  async getLandlordDashboard(user: User) {
    return this.landlordDashboardService.getDashboard(user);
  }

  async searchProperties(
    args: { search?: string; page?: number; limit?: number },
    user: User,
  ) {
    return this.landlordPropertiesService.findAll(
      {
        search: args.search,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async searchRooms(
    args: {
      search?: string;
      propertyId?: string;
      status?: RoomStatus;
      roomType?: RoomType;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.roomsService.findAll(
      {
        search: args.search,
        propertyId: args.propertyId,
        status: args.status,
        roomType: args.roomType,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getRoomDetail(roomId: string, user: User) {
    return this.roomsService.findOne(roomId, user);
  }

  async searchTenants(
    args: {
      search?: string;
      hasAccount?: boolean;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.tenantsService.findAll(
      {
        search: args.search,
        hasAccount: args.hasAccount,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getTenantDetail(tenantId: string, user: User) {
    return this.tenantsService.findOne(tenantId, user);
  }

  async toggleTenantActive(
    args: { tenantId?: string; confirm?: boolean },
    user: User,
  ) {
    if (!args.tenantId) {
      throw new BadRequestException('Cần tenantId của khách thuê cần khóa/mở khóa');
    }

    const target = await this.tenantsService.findOne(args.tenantId, user);
    if (!target.userId) {
      throw new BadRequestException('Khách thuê chưa có tài khoản');
    }

    if (args.confirm !== true) {
      const isActive = (target as any).user?.isActive;
      return {
        toggled: false,
        current: target,
        willChangeTo: !isActive,
        message: `Chưa thực hiện. Xác nhận với người dùng muốn ${
          isActive ? 'khóa' : 'mở khóa'
        } tài khoản khách thuê "${target.fullName}", sau đó gọi lại với confirm=true.`,
      };
    }

    const updated = await this.tenantsService.toggleActive(args.tenantId, user);
    return { toggled: true, tenant: updated };
  }

  async resetTenantPassword(
    args: { tenantId?: string; confirm?: boolean },
    user: User,
  ) {
    if (!args.tenantId) {
      throw new BadRequestException('Cần tenantId của khách thuê cần cấp lại mật khẩu');
    }

    const target = await this.tenantsService.findOne(args.tenantId, user);
    if (!target.userId) {
      throw new BadRequestException('Khách thuê chưa có tài khoản');
    }

    if (args.confirm !== true) {
      return {
        reset: false,
        target,
        message: `Chưa thực hiện. Xác nhận với người dùng muốn cấp lại mật khẩu cho khách thuê "${target.fullName}" (${target.email}) — mật khẩu mới sẽ được gửi tự động qua email, sau đó gọi lại với confirm=true.`,
      };
    }

    const updated = await this.tenantsService.resetPassword(args.tenantId, user);
    return { reset: true, tenant: updated };
  }

  async searchContracts(
    args: {
      search?: string;
      propertyId?: string;
      roomId?: string;
      status?: ContractStatus;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.contractsService.findAll(
      {
        search: args.search,
        propertyId: args.propertyId,
        roomId: args.roomId,
        status: args.status,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getContractDetail(contractId: string, user: User) {
    return this.contractsService.findOne(contractId, user);
  }

  async searchInvoices(
    args: {
      propertyId?: string;
      roomId?: string;
      contractId?: string;
      status?: InvoiceStatus;
      period?: string;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.invoicesService.findAll(
      {
        propertyId: args.propertyId,
        roomId: args.roomId,
        contractId: args.contractId,
        status: args.status,
        period: args.period,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getInvoiceDetail(invoiceId: string, user: User) {
    return this.invoicesService.findOne(invoiceId, user);
  }

  async searchPayments(
    args: {
      invoiceId?: string;
      propertyId?: string;
      paymentMethod?: PaymentMethod;
      source?: PaymentSource;
      referenceCode?: string;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.paymentsService.findAll(
      {
        invoiceId: args.invoiceId,
        propertyId: args.propertyId,
        paymentMethod: args.paymentMethod,
        source: args.source,
        referenceCode: args.referenceCode,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async searchVehicles(
    args: {
      search?: string;
      propertyId?: string;
      tenantId?: string;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.vehiclesService.findAll(
      {
        search: args.search,
        propertyId: args.propertyId,
        tenantId: args.tenantId,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async createInvoiceForContract(
    args: {
      contractId?: string;
      period?: string;
      notes?: string;
      confirm?: boolean;
    },
    user: User,
  ) {
    if (!args.contractId || !args.period) {
      throw new BadRequestException(
        'Cần contractId và period (YYYY-MM) để tạo hóa đơn',
      );
    }

    const dto = await this.validateDto(CreateInvoiceDto, {
      contractId: args.contractId,
      period: args.period,
      notes: args.notes,
    });

    if (args.confirm !== true) {
      const contract = await this.contractsService.findOne(
        args.contractId,
        user,
      );
      return {
        created: false,
        preview: { contract, period: dto.period, notes: dto.notes },
        message:
          'Chưa tạo. Xác nhận lại hợp đồng và kỳ với người dùng, đảm bảo đã nhập đủ chỉ số dịch vụ, sau đó gọi lại với confirm=true để tạo hóa đơn.',
      };
    }

    const invoice = await this.invoicesService.createManual(dto, user);
    return { created: true, invoice };
  }

  async searchMeterReadings(
    args: {
      propertyId?: string;
      roomId?: string;
      serviceId?: string;
      period?: string;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.meterReadingsService.findAll(
      {
        propertyId: args.propertyId,
        roomId: args.roomId,
        serviceId: args.serviceId,
        period: args.period,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getMeterReadingDetail(meterReadingId: string, user: User) {
    return this.meterReadingsService.findOne(meterReadingId, user);
  }

  async createMeterReading(
    args: {
      roomId?: string;
      serviceId?: string;
      period?: string;
      valueStart?: number;
      valueEnd?: number;
      confirm?: boolean;
    },
    user: User,
  ) {
    if (
      !args.roomId ||
      !args.serviceId ||
      !args.period ||
      args.valueStart === undefined ||
      args.valueEnd === undefined
    ) {
      throw new BadRequestException(
        'Cần đủ roomId, serviceId, period, valueStart, valueEnd để ghi chỉ số',
      );
    }

    const dto = await this.validateDto(CreateMeterReadingDto, {
      roomId: args.roomId,
      serviceId: args.serviceId,
      period: args.period,
      valueStart: args.valueStart,
      valueEnd: args.valueEnd,
    });

    if (args.confirm !== true) {
      return {
        created: false,
        preview: dto,
        message:
          'Chưa ghi. Xác nhận lại thông tin chỉ số với người dùng, sau đó gọi lại với confirm=true.',
      };
    }

    const reading = await this.meterReadingsService.create(dto, user);
    return { created: true, reading };
  }

  async updateMeterReading(
    args: {
      meterReadingId?: string;
      valueStart?: number;
      valueEnd?: number;
      confirm?: boolean;
    },
    user: User,
  ) {
    if (!args.meterReadingId) {
      throw new BadRequestException('Cần meterReadingId để chỉnh sửa chỉ số');
    }
    if (args.valueStart === undefined && args.valueEnd === undefined) {
      throw new BadRequestException(
        'Cần ít nhất 1 trong 2: valueStart hoặc valueEnd để chỉnh sửa',
      );
    }

    const dto = await this.validateDto(UpdateMeterReadingDto, {
      valueStart: args.valueStart,
      valueEnd: args.valueEnd,
    });

    if (args.confirm !== true) {
      const current = await this.meterReadingsService.findOne(
        args.meterReadingId,
        user,
      );
      return {
        updated: false,
        current,
        changes: dto,
        message:
          'Chưa cập nhật. Xác nhận lại thay đổi với người dùng, sau đó gọi lại với confirm=true.',
      };
    }

    const updated = await this.meterReadingsService.update(
      args.meterReadingId,
      dto,
      user,
    );
    return { updated: true, reading: updated };
  }

  async cancelInvoice(
    args: { invoiceId?: string; confirm?: boolean },
    user: User,
  ) {
    if (!args.invoiceId) {
      throw new BadRequestException('Cần invoiceId để hủy hóa đơn');
    }

    if (args.confirm !== true) {
      const invoice = await this.invoicesService.findOne(
        args.invoiceId,
        user,
      );
      return {
        cancelled: false,
        invoice,
        message:
          'Chưa hủy. Xác nhận lại hóa đơn cần hủy với người dùng, sau đó gọi lại với confirm=true để hủy.',
      };
    }

    const invoice = await this.invoicesService.cancel(args.invoiceId, user);
    return { cancelled: true, invoice };
  }

  async recordPayment(
    args: {
      invoiceId?: string;
      amount?: number;
      paymentMethod?: PaymentMethod;
      notes?: string;
      confirm?: boolean;
    },
    user: User,
  ) {
    if (!args.invoiceId || !args.amount || !args.paymentMethod) {
      throw new BadRequestException(
        'Cần đủ invoiceId, amount, paymentMethod để ghi nhận thanh toán',
      );
    }

    const dto = await this.validateDto(CreatePaymentDto, {
      invoiceId: args.invoiceId,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      notes: args.notes,
    });

    if (args.confirm !== true) {
      const invoice = await this.invoicesService.findOne(
        args.invoiceId,
        user,
      );
      return {
        recorded: false,
        invoice,
        preview: dto,
        message:
          'Chưa ghi nhận. Xác nhận lại số tiền và hóa đơn với người dùng, sau đó gọi lại với confirm=true để ghi nhận thanh toán.',
      };
    }

    const payment = await this.paymentsService.create(dto, user);
    return { recorded: true, payment };
  }

  async getTenantDashboard(user: User) {
    return this.tenantDashboardService.getDashboard(user);
  }

  async getMyRoom(user: User) {
    return this.tenantRoomService.findCurrentRoom(user);
  }

  async getMyContracts(
    args: { status?: ContractStatus; page?: number; limit?: number },
    user: User,
  ) {
    return this.tenantContractsService.findAll(
      {
        status: args.status,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getMyContractDetail(contractId: string, user: User) {
    return this.tenantContractsService.findOne(contractId, user);
  }

  async getMyInvoices(
    args: {
      status?: InvoiceStatus;
      period?: string;
      page?: number;
      limit?: number;
    },
    user: User,
  ) {
    return this.tenantInvoicesService.findAll(
      {
        status: args.status,
        period: args.period,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getMyInvoiceDetail(invoiceId: string, user: User) {
    return this.tenantInvoicesService.findOne(invoiceId, user);
  }

  async getMyPayments(
    args: { paymentMethod?: PaymentMethod; page?: number; limit?: number },
    user: User,
  ) {
    return this.tenantPaymentsService.findAll(
      {
        paymentMethod: args.paymentMethod,
        page: args.page ?? 1,
        limit: args.limit ?? 20,
      } as any,
      user,
    );
  }

  async getMyPaymentDetail(paymentId: string, user: User) {
    return this.tenantPaymentsService.findOne(paymentId, user);
  }

  async getMyVehicles(user: User) {
    return this.tenantVehiclesService.findMine(user);
  }
}

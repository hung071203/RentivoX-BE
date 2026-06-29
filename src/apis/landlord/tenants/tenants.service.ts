import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { Gender, UserRole } from '@lib/common/enums';
import { AuthUtil } from '@lib/utils/auth.util';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { WorkersService } from '../../../workers/workers.service';
import { UploadsService } from '../../../uploads/uploads.service';
import { BullmqEmailJobEnum } from '@lib/common/constants/bullmq.constant';
import { MailTemplates } from '@lib/common/constants/mail.constant';
import {
  DateFormatEnum,
  DEFAULT_TIMEZONE,
} from '@lib/common/constants/app.constant';
import { DateUtils } from '@lib/utils/date.util';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GetTenantsDto } from './dto/get-tenants.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(RoomOccupant)
    private readonly roomOccupantRepo: Repository<RoomOccupant>,

    private readonly dataSource: DataSource,
    private readonly workersService: WorkersService,
    private readonly uploadsService: UploadsService,
  ) {}

  async findAll(
    dto: GetTenantsDto,
    landlord: User,
  ): Promise<PaginatedResult<Tenant>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.tenantRepo
      .createQueryBuilder('tenant')
      .leftJoin('tenant.user', 'u')
      .addSelect(['u.id', 'u.isActive'])
      .where('tenant.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.search) {
      qb.andWhere(
        '(tenant.fullName LIKE :search OR tenant.phone LIKE :search OR tenant.idCardNumber LIKE :search)',
        { search: `%${dto.search}%` },
      );
    }

    if (dto.hasAccount === true) {
      qb.andWhere('tenant.userId IS NOT NULL');
    } else if (dto.hasAccount === false) {
      qb.andWhere('tenant.userId IS NULL');
    }

    qb.orderBy(`tenant.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, landlord: User): Promise<Tenant> {
    const tenant = await this.tenantRepo
      .createQueryBuilder('tenant')
      .leftJoin('tenant.user', 'u')
      .addSelect(['u.id', 'u.isActive'])
      .where('tenant.id = :id', { id })
      .getOne();
    if (!tenant) throw new NotFoundException('Không tìm thấy khách thuê');
    if (tenant.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập');
    return tenant;
  }

  async toggleActive(id: string, landlord: User): Promise<Tenant> {
    const tenant = await this.findOne(id, landlord);
    if (!tenant.userId)
      throw new BadRequestException('Khách thuê chưa có tài khoản');

    const user = await this.userRepo.findOne({ where: { id: tenant.userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    user.isActive = !user.isActive;
    await this.userRepo.save(user);

    return this.findOne(id, landlord);
  }

  async create(dto: CreateTenantDto, landlord: User): Promise<Tenant> {
    // Validation ngoài transaction
    const idCardConflict = await this.tenantRepo.findOne({
      where: { idCardNumber: dto.idCardNumber, landlordId: landlord.id },
    });
    if (idCardConflict)
      throw new ConflictException('Số căn cước đã được sử dụng');

    if (dto.createAccount && !dto.email)
      throw new BadRequestException('Cần có email để tạo tài khoản');

    let emailJobTo: string | null = null;
    let emailJobPassword: string | null = null;

    const { createAccount, ...tenantData } = dto;

    const saved = await this.dataSource.transaction(async (manager) => {
      const tenant = manager.create(Tenant, {
        ...tenantData,
        landlordId: landlord.id,
      });

      if (createAccount) {
        const existingUser = await manager.findOne(User, {
          where: { email: dto.email! },
        });
        if (existingUser) throw new ConflictException('Email đã được sử dụng.');

        const password = AuthUtil.generateRandomPassword();
        const passwordHash = await AuthUtil.hashPassword(password);
        const user = manager.create(User, {
          email: dto.email!,
          fullName: dto.fullName,
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          gender: dto.gender ?? null,
          passwordHash,
          role: UserRole.TENANT,
        });
        const savedUser = await manager.save(user);
        tenant.userId = savedUser.id;
        emailJobTo = dto.email!;
        emailJobPassword = password;
      }

      return manager.save(tenant);
    });

    if (emailJobTo && emailJobPassword) {
      this.workersService.sendEmailJob(BullmqEmailJobEnum.SEND_EMAIL, {
        template: MailTemplates.CREATE_USER,
        to: emailJobTo,
        context: { email: emailJobTo, password: emailJobPassword },
      });
    }

    return saved;
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    landlord: User,
  ): Promise<Tenant> {
    // Validation ngoài transaction
    const tenant = await this.findOne(id, landlord);
    const hadAccount = !!tenant.userId;

    if (dto.idCardNumber && dto.idCardNumber !== tenant.idCardNumber) {
      const idCardConflict = await this.tenantRepo.findOne({
        where: { idCardNumber: dto.idCardNumber, landlordId: landlord.id },
      });
      if (idCardConflict)
        throw new ConflictException('Số căn cước đã được sử dụng');
    }

    if (dto.email && dto.email !== tenant.email && tenant.userId) {
      const conflict = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (conflict && conflict.id !== tenant.userId)
        throw new ConflictException('Email đã được sử dụng');
    }

    let emailJobTo: string | null = null;
    let emailJobPassword: string | null = null;
    const { createAccount, ...tenantData } = dto;

    const saved = await this.dataSource.transaction(async (manager) => {
      Object.assign(tenant, tenantData);
      const savedTenant = await manager.save(Tenant, tenant);

      if (hadAccount) {
        await this.syncToUserWithManager(manager, tenant.userId!, dto);
      }

      if (createAccount && !hadAccount) {
        if (!savedTenant.email)
          throw new BadRequestException('Cần có email để tạo tài khoản');

        const existingUser = await manager.findOne(User, {
          where: { email: savedTenant.email },
        });
        if (existingUser)
          throw new ConflictException('Email đã được dùng bởi tài khoản khác.');

        const password = AuthUtil.generateRandomPassword();
        const passwordHash = await AuthUtil.hashPassword(password);
        const user = manager.create(User, {
          email: savedTenant.email,
          fullName: savedTenant.fullName,
          phone: savedTenant.phone,
          dateOfBirth: savedTenant.dateOfBirth,
          gender: savedTenant.gender,
          passwordHash,
          role: UserRole.TENANT,
        });
        const savedUser = await manager.save(user);
        savedTenant.userId = savedUser.id;
        await manager.save(Tenant, savedTenant);
        emailJobTo = savedTenant.email;
        emailJobPassword = password;
      }

      return savedTenant;
    });

    if (emailJobTo && emailJobPassword) {
      this.workersService.sendEmailJob(BullmqEmailJobEnum.SEND_EMAIL, {
        template: MailTemplates.CREATE_USER,
        to: emailJobTo,
        context: { email: emailJobTo, password: emailJobPassword },
      });
    }

    return saved;
  }

  async remove(id: string, landlord: User): Promise<void> {
    const tenant = await this.findOne(id, landlord);

    const occupantCount = await this.roomOccupantRepo.count({
      where: { tenantId: id },
    });
    if (occupantCount > 0)
      throw new BadRequestException(
        'Không thể xóa khách thuê đã có lịch sử hợp đồng',
      );

    await this.tenantRepo.remove(tenant);
  }

  async exportExcel(dto: GetTenantsDto, landlord: User): Promise<Buffer> {
    const qb = this.tenantRepo
      .createQueryBuilder('tenant')
      .leftJoin('tenant.user', 'u')
      .addSelect(['u.id', 'u.isActive'])
      .where('tenant.landlordId = :landlordId', { landlordId: landlord.id });

    if (dto.search) {
      qb.andWhere(
        '(tenant.fullName LIKE :search OR tenant.phone LIKE :search OR tenant.idCardNumber LIKE :search)',
        { search: `%${dto.search}%` },
      );
    }
    if (dto.hasAccount === true) {
      qb.andWhere('tenant.userId IS NOT NULL');
    } else if (dto.hasAccount === false) {
      qb.andWhere('tenant.userId IS NULL');
    }

    qb.orderBy('tenant.createdAt', OrderDirection.DESC);
    const tenants = await qb.getMany();

    const genderLabel: Record<string, string> = {
      [Gender.MALE]: 'Nam',
      [Gender.FEMALE]: 'Nữ',
      [Gender.OTHER]: 'Khác',
    };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Khách thuê');

    ws.columns = [
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'SĐT', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'CCCD', key: 'idCardNumber', width: 18 },
      { header: 'Ngày sinh', key: 'dateOfBirth', width: 14 },
      { header: 'Giới tính', key: 'gender', width: 12 },
      { header: 'Địa chỉ thường trú', key: 'permanentAddress', width: 35 },
      { header: 'Có tài khoản', key: 'hasAccount', width: 14 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };

    for (const t of tenants) {
      const dobStr = t.dateOfBirth
        ? DateUtils.getFormatDateInTimezone(
            new Date(t.dateOfBirth),
            DEFAULT_TIMEZONE,
            DateFormatEnum.YYYY_MM_DD,
          )
            .split('-')
            .reverse()
            .join('/')
        : '';

      ws.addRow({
        fullName: t.fullName ?? '',
        phone: t.phone ?? '',
        email: t.email ?? '',
        idCardNumber: t.idCardNumber ?? '',
        dateOfBirth: dobStr,
        gender: t.gender ? (genderLabel[t.gender] ?? t.gender) : '',
        permanentAddress: t.permanentAddress ?? '',
        hasAccount: t.userId ? 'Có' : 'Không',
      });
    }

    return workbook.xlsx.writeBuffer().then((ab) => Buffer.from(ab));
  }

  async uploadIdCard(
    id: string,
    file: Express.Multer.File,
    side: 'front' | 'back',
    landlord: User,
  ): Promise<Tenant> {
    const tenant = await this.findOne(id, landlord);
    const field = side === 'front' ? 'idCardFrontUrl' : 'idCardBackUrl';

    await this.uploadsService.deleteFile(tenant[field]);
    tenant[field] = this.uploadsService.getFileUrl('id-cards', file.filename);

    return this.tenantRepo.save(tenant);
  }

  private async syncToUserWithManager(
    manager: EntityManager,
    userId: string,
    dto: UpdateTenantDto,
  ): Promise<void> {
    const user = await manager.findOne(User, { where: { id: userId } });
    if (!user) return;

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.dateOfBirth !== undefined)
      user.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.gender !== undefined) user.gender = dto.gender ?? null;

    await manager.save(user);
  }
}

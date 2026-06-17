import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '@entities/tenant.entity';
import { User } from '@entities/user.entity';
import { RoomOccupant } from '@entities/room-occupant.entity';
import { UserRole } from '@lib/common/enums';
import { AuthUtil } from '@lib/utils/auth.util';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { WorkersService } from '../../../workers/workers.service';
import { UploadsService } from '../../../uploads/uploads.service';
import {
  BullmqEmailJobEnum,
} from '@lib/common/constants/bullmq.constant';
import { MailTemplates } from '@lib/common/constants/mail.constant';
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

    private readonly workersService: WorkersService,
    private readonly uploadsService: UploadsService,
  ) {}

  async findAll(dto: GetTenantsDto, landlord: User): Promise<PaginatedResult<Tenant>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.tenantRepo
      .createQueryBuilder('tenant')
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
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Không tìm thấy khách thuê');
    if (tenant.landlordId !== landlord.id)
      throw new ForbiddenException('Không có quyền truy cập');
    return tenant;
  }

  async create(dto: CreateTenantDto, landlord: User): Promise<Tenant> {
    if (dto.createAccount) {
      if (!dto.email)
        throw new BadRequestException('Cần có email để tạo tài khoản');
      const existing = await this.userRepo.findOne({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email đã được sử dụng');
    }

    const { createAccount, ...tenantData } = dto;
    const tenant = this.tenantRepo.create({ ...tenantData, landlordId: landlord.id });

    if (createAccount) {
      const password = AuthUtil.generateRandomPassword();
      const passwordHash = await AuthUtil.hashPassword(password);
      const user = this.userRepo.create({
        email: dto.email!,
        fullName: dto.fullName,
        phone: dto.phone,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender ?? null,
        passwordHash,
        role: UserRole.TENANT,
      });
      const savedUser = await this.userRepo.save(user);
      tenant.userId = savedUser.id;

      this.workersService.sendEmailJob(BullmqEmailJobEnum.SEND_EMAIL, {
        template: MailTemplates.CREATE_USER,
        to: dto.email!,
        context: { email: dto.email!, password },
      });
    }

    return this.tenantRepo.save(tenant);
  }

  async update(id: string, dto: UpdateTenantDto, landlord: User): Promise<Tenant> {
    const tenant = await this.findOne(id, landlord);
    const hadAccount = !!tenant.userId;

    if (dto.email && dto.email !== tenant.email && tenant.userId) {
      const conflict = await this.userRepo.findOne({ where: { email: dto.email } });
      if (conflict && conflict.id !== tenant.userId)
        throw new ConflictException('Email đã được sử dụng');
    }

    const { createAccount, ...tenantData } = dto;
    Object.assign(tenant, tenantData);
    const saved = await this.tenantRepo.save(tenant);

    if (hadAccount) {
      await this.syncToUser(tenant.userId!, dto);
    }

    if (createAccount && !hadAccount) {
      return this.grantAccount(saved.id, landlord);
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

  private async grantAccount(id: string, landlord: User): Promise<Tenant> {
    const tenant = await this.findOne(id, landlord);

    if (tenant.userId)
      throw new BadRequestException('Khách thuê đã có tài khoản');
    if (!tenant.email)
      throw new BadRequestException('Cần có email để tạo tài khoản');

    const existing = await this.userRepo.findOne({ where: { email: tenant.email } });
    if (existing) throw new ConflictException('Email đã được sử dụng bởi tài khoản khác');

    const password = AuthUtil.generateRandomPassword();
    const passwordHash = await AuthUtil.hashPassword(password);
    const user = this.userRepo.create({
      email: tenant.email,
      fullName: tenant.fullName,
      phone: tenant.phone,
      dateOfBirth: tenant.dateOfBirth,
      gender: tenant.gender,
      passwordHash,
      role: UserRole.TENANT,
    });
    const savedUser = await this.userRepo.save(user);

    tenant.userId = savedUser.id;
    const saved = await this.tenantRepo.save(tenant);

    this.workersService.sendEmailJob(BullmqEmailJobEnum.SEND_EMAIL, {
      template: MailTemplates.CREATE_USER,
      to: tenant.email,
      context: { email: tenant.email, password },
    });

    return saved;
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

  private async syncToUser(userId: string, dto: UpdateTenantDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.dateOfBirth !== undefined)
      user.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.gender !== undefined) user.gender = dto.gender ?? null;

    await this.userRepo.save(user);
  }
}

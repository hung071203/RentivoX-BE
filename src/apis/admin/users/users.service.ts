import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { UserRole } from '@lib/common/enums';
import { AuthUtil } from '@lib/utils/auth.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(dto: GetUsersDto): Promise<PaginatedResult<User>> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const orderBy = dto.orderBy ?? 'createdAt';
    const orderDirection = dto.orderDirection ?? OrderDirection.DESC;

    const qb = this.userRepo.createQueryBuilder('user');

    if (dto.search) {
      qb.where('(user.fullName LIKE :search OR user.email LIKE :search)', {
        search: `%${dto.search}%`,
      });
    }
    if (dto.role) {
      qb.andWhere('user.role = :role', { role: dto.role });
    }
    if (dto.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: dto.isActive });
    }

    qb.orderBy(`user.${orderBy}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async create(dto: CreateUserDto, currentUser: User) {
    // super_admin chỉ có 1, không tạo thêm
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Không thể tạo thêm quản trị viên cấp cao');
    }
    // Tenant do chủ trọ quản lý, không tạo qua admin panel
    if (dto.role === UserRole.TENANT) {
      throw new ForbiddenException('Tài khoản khách hàng do chủ trọ quản lý');
    }
    // Chỉ super_admin mới tạo được admin
    if (dto.role === UserRole.ADMIN && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Chỉ quản trị viên cấp cao mới có thể tạo tài khoản admin');
    }

    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email đã tồn tại');

    const password = AuthUtil.generateRandomPassword();
    const passwordHash = await AuthUtil.hashPassword(password);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      phone: dto.phone,
    });
    return this.userRepo.save(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUser: User) {
    const user = await this.findOne(id);

    // Tenant do chủ trọ quản lý, không chỉnh sửa qua admin panel
    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tài khoản khách hàng do chủ trọ quản lý');
    }
    // Admin thường không chỉnh sửa được super_admin hoặc admin khác
    if (currentUser.role === UserRole.ADMIN && ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Không có quyền chỉnh sửa tài khoản này');
    }

    if (dto.isResetPassword) {
      const newPassword = AuthUtil.generateRandomPassword();
      user.passwordHash = await AuthUtil.hashPassword(newPassword);
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.userRepo.findOne({ where: { email: dto.email } });
      if (exists) throw new ConflictException('Email đã tồn tại');
      user.email = dto.email;
    }

    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) user.phone = dto.phone;
    return this.userRepo.save(user);
  }

  async toggleActive(id: string, currentUser: User) {
    const user = await this.findOne(id);

    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tài khoản khách hàng do chủ trọ quản lý');
    }
    if (currentUser.role === UserRole.ADMIN && ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Không có quyền thao tác trên tài khoản này');
    }

    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async remove(id: string, currentUser: User) {
    const user = await this.findOne(id);

    if (user.role === UserRole.TENANT) {
      throw new ForbiddenException('Tài khoản khách hàng do chủ trọ quản lý');
    }
    if (currentUser.role === UserRole.ADMIN && ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Không có quyền xóa tài khoản này');
    }

    await this.userRepo.remove(user);
  }
}

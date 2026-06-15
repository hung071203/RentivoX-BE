import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/user.entity';
import { OrderDirection, PaginatedResult } from '@lib/common/dto';
import { AuthUtil } from '@lib/utils/auth.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';

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

  async create(dto: CreateUserDto) {
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

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (dto.isResetPassword) {
      const newPassword = AuthUtil.generateRandomPassword();
      user.passwordHash = await AuthUtil.hashPassword(newPassword);
    }
    if (dto.fullName) user.fullName = dto.fullName;
    if (dto.phone) user.phone = dto.phone;
    if (dto.role) user.role = dto.role;
    return this.userRepo.save(user);
  }

  async toggleActive(id: string) {
    const user = await this.findOne(id);
    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.userRepo.remove(user);
  }
}

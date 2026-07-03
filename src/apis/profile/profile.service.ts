import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../lib/database/entities/user.entity';
import { Tenant } from '../../../lib/database/entities/tenant.entity';
import { AuthUtil } from '../../../lib/src/utils/auth.util';
import { OtpContext, OtpService } from '../../../lib/src/services/otp.service';
import { WorkersService } from '../../workers/workers.service';
import { BullmqEmailJobEnum } from '@lib/common/constants/bullmq.constant';
import { MailTemplates } from '@lib/common/constants/mail.constant';
import { UserRole } from '@lib/common/enums';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SendOtpEmailDto } from './dto/send-otp-email.dto';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly otpService: OtpService,
    private readonly workersService: WorkersService,
  ) {}

  private async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        bankName: true,
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.findById(userId);
    if (user.role === UserRole.TENANT) {
      const tenant = await this.tenantRepo.findOne({
        where: { userId },
        select: {
          idCardNumber: true,
          idCardIssuedDate: true,
          idCardIssuedPlace: true,
          permanentAddress: true,
          idCardFrontUrl: true,
          idCardBackUrl: true,
        },
      });
      if (tenant) {
        return {
          ...user,
          idCardNumber: tenant.idCardNumber ?? null,
          idCardIssuedDate: tenant.idCardIssuedDate ?? null,
          idCardIssuedPlace: tenant.idCardIssuedPlace ?? null,
          permanentAddress: tenant.permanentAddress ?? null,
          idCardFrontUrl: tenant.idCardFrontUrl ?? null,
          idCardBackUrl: tenant.idCardBackUrl ?? null,
        };
      }
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<any> {
    const user = await this.findById(userId);
    const sharedUpdates = {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.dateOfBirth !== undefined && { dateOfBirth: dto.dateOfBirth as any }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
    };

    await this.userRepo.update(userId, sharedUpdates);

    if (user.role === UserRole.TENANT && Object.keys(sharedUpdates).length > 0) {
      await this.tenantRepo.update({ userId }, sharedUpdates);
    }

    if (user.role === UserRole.LANDLORD) {
      const bankUpdates = {
        ...(dto.bankBin !== undefined && { bankBin: dto.bankBin }),
        ...(dto.bankAccountNumber !== undefined && {
          bankAccountNumber: dto.bankAccountNumber,
        }),
        ...(dto.bankAccountHolder !== undefined && {
          bankAccountHolder: dto.bankAccountHolder,
        }),
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
      };
      if (Object.keys(bankUpdates).length > 0) {
        await this.userRepo.update(userId, bankUpdates);
      }
    }

    return this.getProfile(userId);
  }

  async sendOtpForEmailChange(
    userId: string,
    dto: SendOtpEmailDto,
  ): Promise<{ message: string }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.newEmail } });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Email đã được sử dụng bởi tài khoản khác.');
    }

    const otp = await this.otpService.request(OtpContext.CHANGE_EMAIL, userId, {
      newEmail: dto.newEmail,
    });

    this.workersService.sendEmailJob(BullmqEmailJobEnum.SEND_EMAIL, {
      to: dto.newEmail,
      template: MailTemplates.OTP,
      context: { otp, expiresInMinutes: 10, purpose: 'xác nhận đổi email' },
    });

    return { message: `Mã OTP đã được gửi đến ${dto.newEmail}.` };
  }

  async updateEmail(userId: string, dto: UpdateEmailDto): Promise<User> {
    const data = await this.otpService.verify(OtpContext.CHANGE_EMAIL, userId, dto.otp);

    if (data.newEmail !== dto.newEmail) {
      throw new BadRequestException('Email không khớp với yêu cầu OTP.');
    }

    const existing = await this.userRepo.findOne({ where: { email: dto.newEmail } });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Email đã được sử dụng bởi tài khoản khác.');
    }

    await this.userRepo.update(userId, { email: dto.newEmail });

    const user = await this.findById(userId);
    if (user.role === UserRole.TENANT) {
      await this.tenantRepo.update({ userId }, { email: dto.newEmail });
    }

    return this.getProfile(userId);
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const isMatch = await AuthUtil.comparePassword(dto.currentPassword, user.passwordHash);
    if (!isMatch) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không khớp');
    }

    const isSame = await AuthUtil.comparePassword(dto.newPassword, user.passwordHash);
    if (isSame) throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');

    const hash = await AuthUtil.hashPassword(dto.newPassword);
    await this.userRepo.update(userId, { passwordHash: hash });
  }
}

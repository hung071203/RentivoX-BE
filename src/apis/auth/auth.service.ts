import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../lib/database/entities/user.entity';
import { AuthUtil } from '../../../lib/src/utils/auth.util';
import { OtpContext, OtpService } from '../../../lib/src/services/otp.service';
import { WorkersService } from '../../workers/workers.service';
import { BullmqEmailJobEnum } from '@lib/common/constants/bullmq.constant';
import { MailTemplates } from '@lib/common/constants/mail.constant';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly workersService: WorkersService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const isMatch = await AuthUtil.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!isMatch)
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async sendForgotPasswordOtp(dto: ForgotPasswordDto): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
    });

    // Không tiết lộ email có tồn tại hay không
    if (!user) return true;

    const otp = await this.otpService.request(
      OtpContext.FORGOT_PASSWORD,
      user.id,
    );

    this.workersService.sendEmailJob(BullmqEmailJobEnum.SEND_EMAIL, {
      to: user.email,
      template: MailTemplates.OTP,
      context: { otp, expiresInMinutes: 10, purpose: 'đặt lại mật khẩu' },
    });

    return true;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không khớp.');
    }

    const user = await this.userRepo.findOne({
      where: { email: dto.email, isActive: true },
    });
    if (!user) throw new NotFoundException('Tài khoản không tồn tại.');

    // Check trước khi verify OTP (OTP dùng 1 lần, bị xoá ngay khi verify đúng) —
    // tránh lãng phí OTP hợp lệ chỉ vì người dùng lỡ chọn lại mật khẩu cũ
    const isSame = await AuthUtil.comparePassword(
      dto.newPassword,
      user.passwordHash,
    );
    if (isSame)
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ.');

    await this.otpService.verify(OtpContext.FORGOT_PASSWORD, user.id, dto.otp);

    const hash = await AuthUtil.hashPassword(dto.newPassword);
    await this.userRepo.update(user.id, { passwordHash: hash });

    return { message: 'Đặt lại mật khẩu thành công.' };
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../lib/database/entities/user.entity';
import { JwtStrategy } from '../../../lib/src/guards/jwt.strategy';
import { ENV } from '../../../lib/src/configs/env.config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: ENV.jwt.secret,
      signOptions: { expiresIn: ENV.jwt.expiresIn as any },
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}

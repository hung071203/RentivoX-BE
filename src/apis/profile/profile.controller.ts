import { Body, Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../lib/src/guards/jwt-auth.guard';
import { CurrentUser } from '../../../lib/src/decorators/current-user.decorator';
import { User } from '../../../lib/database/entities/user.entity';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Patch('email')
  updateEmail(@CurrentUser() user: User, @Body() dto: UpdateEmailDto) {
    return this.profileService.updateEmail(user.id, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePassword(@CurrentUser() user: User, @Body() dto: UpdatePasswordDto) {
    return this.profileService.updatePassword(user.id, dto);
  }
}

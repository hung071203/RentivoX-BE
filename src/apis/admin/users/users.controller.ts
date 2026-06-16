import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { CurrentUser, Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersDto } from './dto/get-users.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() dto: GetUsersDto) {
    return this.usersService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: User) {
    return this.usersService.create(dto, currentUser);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() currentUser: User) {
    return this.usersService.update(id, dto, currentUser);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.usersService.toggleActive(id, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.usersService.remove(id, currentUser);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard } from '@lib/guards';
import { CurrentUser, Roles } from '@lib/decorators';
import { UserRole } from '@lib/common/enums';
import { User } from '@entities/user.entity';
import { multerConfig } from '@lib/configs/multer.config';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { GetContractsDto } from './dto/get-contracts.dto';
import { CreateAmendmentDto } from './dto/create-amendment.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { AddOccupantDto } from './dto/add-occupant.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.LANDLORD)
@Controller('landlord/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  findAll(@Query() dto: GetContractsDto, @CurrentUser() user: User) {
    return this.contractsService.findAll(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.contractsService.findOne(id, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', multerConfig('contracts', 'doc')))
  create(
    @Body() dto: CreateContractDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('File hợp đồng là bắt buộc');
    return this.contractsService.create(dto, user, file);
  }

  @Post(':id/amendments')
  @UseInterceptors(FileInterceptor('file', multerConfig('contracts', 'doc')))
  createAmendment(
    @Param('id') id: string,
    @Body() dto: CreateAmendmentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('File phụ lục là bắt buộc');
    return this.contractsService.createAmendment(id, dto, file, user);
  }

  @Post(':id/occupants')
  addOccupant(
    @Param('id') id: string,
    @Body() dto: AddOccupantDto,
    @CurrentUser() user: User,
  ) {
    return this.contractsService.addOccupant(id, dto, user);
  }

  @Delete(':id/occupants/:occupantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeOccupant(
    @Param('id') id: string,
    @Param('occupantId') occupantId: string,
    @CurrentUser() user: User,
  ) {
    return this.contractsService.removeOccupant(id, occupantId, user);
  }

  @Patch(':id/terminate')
  terminate(
    @Param('id') id: string,
    @Body() dto: TerminateContractDto,
    @CurrentUser() user: User,
  ) {
    return this.contractsService.terminate(id, dto, user);
  }

}

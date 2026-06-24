import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { ContractStatus } from '@lib/common/enums';
import { Trim } from '@lib/decorators';

export class GetContractsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'startDate', 'endDate', 'rentAmount'])
  declare orderBy?: string;
}

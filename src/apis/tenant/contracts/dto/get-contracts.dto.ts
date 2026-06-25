import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { ContractStatus } from '@lib/common/enums';

export class GetTenantContractsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @IsOptional()
  @IsIn(['createdAt', 'startDate', 'endDate'])
  declare orderBy?: string;
}

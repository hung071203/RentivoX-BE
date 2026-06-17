import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@lib/common/dto';
import { Trim } from '@lib/decorators';

export class GetPropertiesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;
}

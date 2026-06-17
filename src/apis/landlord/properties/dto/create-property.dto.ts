import { IsOptional, IsString } from 'class-validator';
import { Trim } from '@lib/decorators';

export class CreatePropertyDto {
  @IsString()
  @Trim()
  name: string;

  @IsString()
  @Trim()
  address: string;

  @IsOptional()
  @IsString()
  @Trim()
  ward?: string;

  @IsOptional()
  @IsString()
  @Trim()
  district?: string;

  @IsOptional()
  @IsString()
  @Trim()
  province?: string;
}

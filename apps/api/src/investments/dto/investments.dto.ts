import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateInvestmentDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  type!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentValue!: number;

  @IsDateString()
  date!: string;
}

export class UpdateInvestmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentValue?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}

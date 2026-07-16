import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DateRangeQueryDto extends PaginationQueryDto {
  @IsOptional()
  from?: string;

  @IsOptional()
  to?: string;
}

export function paginate(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

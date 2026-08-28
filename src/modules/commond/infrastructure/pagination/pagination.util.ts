import { PaginatedResult, Pagination } from '../../domain/entities/pagination.entity';

export function toSkipTake({ page, limit }: Pagination): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  { page, limit }: Pagination,
): PaginatedResult<T> {
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

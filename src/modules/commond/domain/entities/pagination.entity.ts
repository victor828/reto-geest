export interface Pagination {
  page: number;
  limit: number;
}

export interface PaginationMeta extends Pagination {
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

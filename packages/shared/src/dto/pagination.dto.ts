/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Pagination query params
 */
export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

/**
 * Default pagination config
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

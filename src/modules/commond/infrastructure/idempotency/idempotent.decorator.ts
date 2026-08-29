import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'idempotent';

/** Marca un handler POST como elegible para deduplicación por Idempotency-Key (ver IdempotencyInterceptor). */
export const Idempotent = () => SetMetadata(IDEMPOTENT_METADATA_KEY, true);

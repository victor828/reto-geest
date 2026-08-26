import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'idempotent';

/** Marks a POST handler as eligible for Idempotency-Key deduplication (see IdempotencyInterceptor). */
export const Idempotent = () => SetMetadata(IDEMPOTENT_METADATA_KEY, true);

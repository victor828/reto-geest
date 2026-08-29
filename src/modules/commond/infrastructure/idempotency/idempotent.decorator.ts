import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_METADATA_KEY = 'idempotent';

export interface IdempotentOptions {
  /**
   * Si no llega el header Idempotency-Key, deriva una clave determinística de method+path+body en
   * vez de omitir la deduplicación. Solo debe usarse en endpoints naturalmente idempotentes por
   * body (p. ej. completar una tarea para un usuario dado); en endpoints con semántica no
   * idempotente por diseño (p. ej. un toggle) repetir el mismo body a propósito debe re-ejecutar.
   */
  autoKeyFromBody?: boolean;
}

const DEFAULT_OPTIONS: Required<IdempotentOptions> = { autoKeyFromBody: false };

/** Marca un handler POST como elegible para deduplicación por Idempotency-Key (ver IdempotencyInterceptor). */
export const Idempotent = (options: IdempotentOptions = {}) =>
  SetMetadata(IDEMPOTENT_METADATA_KEY, { ...DEFAULT_OPTIONS, ...options });

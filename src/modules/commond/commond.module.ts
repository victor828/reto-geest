import { Global, Module } from '@nestjs/common';
import { CommonUseCase } from './application/use-cases/common.use-case';
import { ErrorsUseCase } from './application/use-cases/errors.use-case';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [CommonUseCase, ErrorsUseCase],
  exports: [CommonUseCase, ErrorsUseCase],
})
export class CommondModule {}

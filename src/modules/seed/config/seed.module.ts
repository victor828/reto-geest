import { Module } from '@nestjs/common';
import { SeedController } from '../infrastructure/controllers/seed.controller';
import { StarterSeederUseCase } from '../application/use-cases/commands/starter-seeder.use-case';
import { SeedCreateUsersUseCase } from '../application/use-cases/commands/seed-create-users.use-case';

@Module({
  imports: [],
  controllers: [SeedController],
  providers: [StarterSeederUseCase, SeedCreateUsersUseCase],
})
export class SeedModule {}

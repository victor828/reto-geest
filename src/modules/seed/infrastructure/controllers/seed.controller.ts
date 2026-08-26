import { Controller, Get } from '@nestjs/common';
import { StarterSeederUseCase } from '../../application/use-cases/commands/starter-seeder.use-case';

@Controller({ path: 'seed', version: '1' })
export class SeedController {
  constructor(private readonly starterSeederUseCase: StarterSeederUseCase) {}

  @Get()
  startSeed() {
    return this.starterSeederUseCase.starterSedder();
  }
}

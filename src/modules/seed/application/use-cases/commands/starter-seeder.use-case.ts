import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SeedCreateUsersUseCase } from './seed-create-users.use-case';
import { ErrorsUseCase } from 'src/modules/commond/application/use-cases/errors.use-case';

@Injectable()
export class StarterSeederUseCase {
  private readonly logger = new Logger(StarterSeederUseCase.name);
  constructor(private readonly userSeeder: SeedCreateUsersUseCase) {}

  starterSedder() {
    try {
      this.logger.verbose('Starting seed process...');
      this.userSeeder.getUsers();

      this.logger.verbose('Seed process completed successfully.');
      return { message: 'Seed process completed successfully.' };
    } catch (error) {
      this.logger.error('Error occurred while starting seed process: ');
      ErrorsUseCase.setError(error);
    }
  }
}

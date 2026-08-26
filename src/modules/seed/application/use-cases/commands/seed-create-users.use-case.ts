import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SeedCreateUsersUseCase {
  private readonly logger = new Logger(SeedCreateUsersUseCase.name);
  private readonly users = [
    { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com' },
  ];

  getUsers(): void {
    this.logger.verbose('Starting users seed process...');

    this.logger.debug(this.users);
    // TODO: Implement the logic to seed users into the database or any other storage mechanism.
  }
}

import { CreateUserService } from './create-user.service';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

describe('CreateUserService', () => {
  it('delegates creation to the repository port', async () => {
    const repository: jest.Mocked<UsersRepositoryPort> = {
      create: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Ana',
        lastName: 'Perez',
        email: 'ana@example.com',
        createdAt: new Date(),
      }),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findManyByIds: jest.fn(),
      findAllWithPendingTasks: jest.fn(),
      findUserTasks: jest.fn(),
    };

    const service = new CreateUserService(repository);
    const dto = { name: 'Ana', lastName: 'Perez', email: 'ana@example.com' };
    const result = await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(result.email).toBe('ana@example.com');
  });
});

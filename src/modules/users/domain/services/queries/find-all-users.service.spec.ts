import { FindAllUsersService } from './find-all-users.service';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

describe('FindAllUsersService', () => {
  it('delegates to the repository and returns users with their pending tasks', async () => {
    const users = [
      {
        id: 1,
        name: 'Ana',
        lastName: 'Perez',
        email: 'ana@example.com',
        createdAt: new Date(),
        pendingTasks: [{ id: 1, title: 'T1' }],
      },
    ];
    const repo = {
      findAllWithPendingTasks: jest.fn().mockResolvedValue(users),
    } as unknown as jest.Mocked<UsersRepositoryPort>;
    const service = new FindAllUsersService(repo);

    await expect(service.findAll()).resolves.toEqual(users);
    expect(repo.findAllWithPendingTasks).toHaveBeenCalledWith();
  });

  it('returns an empty list when there are no users', async () => {
    const repo = {
      findAllWithPendingTasks: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<UsersRepositoryPort>;
    const service = new FindAllUsersService(repo);

    await expect(service.findAll()).resolves.toEqual([]);
  });
});

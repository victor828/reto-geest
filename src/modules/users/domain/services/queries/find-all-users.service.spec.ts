import { FindAllUsersService } from './find-all-users.service';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

describe('FindAllUsersService', () => {
  it('delegates to the repository and returns paginated users with their pending tasks', async () => {
    const result = {
      data: [
        {
          id: 1,
          name: 'Ana',
          lastName: 'Perez',
          email: 'ana@example.com',
          createdAt: new Date(),
          pendingTasks: [{ id: 1, title: 'T1' }],
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const repo = {
      findAllWithPendingTasks: jest.fn().mockResolvedValue(result),
    } as unknown as jest.Mocked<UsersRepositoryPort>;
    const service = new FindAllUsersService(repo);

    await expect(service.findAll({ page: 1, limit: 20 })).resolves.toEqual(result);
    expect(repo.findAllWithPendingTasks).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('returns an empty page when there are no users', async () => {
    const result = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    const repo = {
      findAllWithPendingTasks: jest.fn().mockResolvedValue(result),
    } as unknown as jest.Mocked<UsersRepositoryPort>;
    const service = new FindAllUsersService(repo);

    await expect(service.findAll({ page: 1, limit: 20 })).resolves.toEqual(result);
  });
});

import { FindUserTasksService } from './find-user-tasks.service';
import { UsersRepositoryPort } from '../../../infrastructure/adapters/ports/users-repository.port';

describe('FindUserTasksService', () => {
  it('returns the tasks assigned to an existing user', async () => {
    const tasks = [{ id: 1, title: 'T', description: null, status: 'open', completed: false }];
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        name: 'A',
        lastName: 'B',
        email: 'a@x.com',
        createdAt: new Date(),
      }),
      findUserTasks: jest.fn().mockResolvedValue(tasks),
    } as unknown as jest.Mocked<UsersRepositoryPort>;
    const service = new FindUserTasksService(repo);

    await expect(service.findUserTasks(1)).resolves.toEqual(tasks);
  });

  it('throws USER_NOT_FOUND for a nonexistent user', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(null),
      findUserTasks: jest.fn(),
    } as unknown as jest.Mocked<UsersRepositoryPort>;
    const service = new FindUserTasksService(repo);

    await expect(service.findUserTasks(999)).rejects.toMatchObject({
      response: { error: { code: 'USER_NOT_FOUND' } },
    });
    expect(repo.findUserTasks).not.toHaveBeenCalled();
  });
});

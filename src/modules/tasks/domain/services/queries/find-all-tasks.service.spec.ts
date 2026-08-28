import { FindAllTasksService } from './find-all-tasks.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

describe('FindAllTasksService', () => {
  it('delegates to the repository without a status filter', async () => {
    const result = {
      data: [
        {
          id: 1,
          title: 'T',
          description: null,
          status: 'open' as const,
          createdAt: new Date(),
          archivedAt: null,
          assignees: [],
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const repo = {
      findAll: jest.fn().mockResolvedValue(result),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindAllTasksService(repo);

    await expect(service.findAll(undefined, { page: 1, limit: 20 })).resolves.toEqual(result);
    expect(repo.findAll).toHaveBeenCalledWith(undefined, { page: 1, limit: 20 });
  });

  it('forwards the status filter and pagination to the repository', async () => {
    const result = { data: [], meta: { page: 2, limit: 5, total: 0, totalPages: 0 } };
    const repo = {
      findAll: jest.fn().mockResolvedValue(result),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindAllTasksService(repo);

    await service.findAll('archived', { page: 2, limit: 5 });

    expect(repo.findAll).toHaveBeenCalledWith('archived', { page: 2, limit: 5 });
  });
});

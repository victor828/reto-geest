import { FindAllTasksService } from './find-all-tasks.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

describe('FindAllTasksService', () => {
  it('delegates to the repository without a status filter', async () => {
    const tasks = [
      {
        id: 1,
        title: 'T',
        description: null,
        status: 'open' as const,
        createdAt: new Date(),
        archivedAt: null,
        assignees: [],
      },
    ];
    const repo = {
      findAll: jest.fn().mockResolvedValue(tasks),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindAllTasksService(repo);

    await expect(service.findAll()).resolves.toEqual(tasks);
    expect(repo.findAll).toHaveBeenCalledWith(undefined);
  });

  it('forwards the status filter to the repository', async () => {
    const repo = {
      findAll: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindAllTasksService(repo);

    await service.findAll('archived');

    expect(repo.findAll).toHaveBeenCalledWith('archived');
  });
});

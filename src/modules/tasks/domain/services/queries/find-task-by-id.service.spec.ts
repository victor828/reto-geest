import { FindTaskByIdService } from './find-task-by-id.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

describe('FindTaskByIdService', () => {
  it('returns the task detail when found', async () => {
    const detail = {
      id: 1,
      title: 'T',
      description: null,
      status: 'open' as const,
      createdAt: new Date(),
      archivedAt: null,
      assignees: [],
    };
    const repo = {
      findDetailById: jest.fn().mockResolvedValue(detail),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindTaskByIdService(repo);

    await expect(service.findById(1)).resolves.toEqual(detail);
  });

  it('throws TASK_NOT_FOUND when the task does not exist', async () => {
    const repo = {
      findDetailById: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindTaskByIdService(repo);

    await expect(service.findById(999)).rejects.toMatchObject({
      response: { error: { code: 'TASK_NOT_FOUND' } },
    });
  });
});

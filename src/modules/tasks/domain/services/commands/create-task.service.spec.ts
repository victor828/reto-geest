import { CreateTaskService } from './create-task.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

describe('CreateTaskService', () => {
  it('delegates creation to the repository port', async () => {
    const created = {
      id: 1,
      title: 'Write report',
      description: null,
      status: 'open' as const,
      createdAt: new Date(),
      archivedAt: null,
    };
    const repo = {
      create: jest.fn().mockResolvedValue(created),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new CreateTaskService(repo);
    const dto = { title: 'Write report', description: null };

    const result = await service.create(dto);

    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(created);
  });
});

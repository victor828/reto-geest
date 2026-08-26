import { FindTaskNotificationsService } from './find-task-notifications.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

const task = {
  id: 1,
  title: 'T',
  description: null,
  status: 'archived' as const,
  createdAt: new Date(),
  archivedAt: new Date(),
};

describe('FindTaskNotificationsService', () => {
  it('returns the notification attempts for an existing task', async () => {
    const attempts = [
      {
        attemptNumber: 1,
        httpStatus: 200,
        success: true,
        errorMessage: null,
        attemptedAt: new Date(),
      },
    ];
    const repo = {
      findById: jest.fn().mockResolvedValue(task),
      findNotifications: jest.fn().mockResolvedValue(attempts),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindTaskNotificationsService(repo);

    await expect(service.findNotifications(1)).resolves.toEqual(attempts);
    expect(repo.findNotifications).toHaveBeenCalledWith(1);
  });

  it('throws TASK_NOT_FOUND when the task does not exist', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(null),
      findNotifications: jest.fn(),
    } as unknown as jest.Mocked<TasksRepositoryPort>;
    const service = new FindTaskNotificationsService(repo);

    await expect(service.findNotifications(999)).rejects.toMatchObject({
      response: { error: { code: 'TASK_NOT_FOUND' } },
    });
    expect(repo.findNotifications).not.toHaveBeenCalled();
  });
});

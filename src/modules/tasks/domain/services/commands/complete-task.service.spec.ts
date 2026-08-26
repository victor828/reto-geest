import { CompleteTaskService } from './complete-task.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';
import { NotificationService } from '../../../infrastructure/notifications/notification.service';

const task = {
  id: 1,
  title: 'T',
  description: null,
  status: 'open' as const,
  createdAt: new Date(),
  archivedAt: null,
};

const detail = { ...task, assignees: [] };

function makeTasksRepo(
  overrides: Partial<jest.Mocked<TasksRepositoryPort>> = {},
): jest.Mocked<TasksRepositoryPort> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findDetailById: jest.fn().mockResolvedValue(detail),
    findAll: jest.fn(),
    assignUsers: jest.fn(),
    completeForUser: jest.fn(),
    findNotifications: jest.fn(),
    ...overrides,
  };
}

function makeNotificationService(): jest.Mocked<NotificationService> {
  return { notifyArchived: jest.fn() } as unknown as jest.Mocked<NotificationService>;
}

describe('CompleteTaskService', () => {
  it('does not notify when the task was not the last pending one', async () => {
    const tasksRepo = makeTasksRepo({
      completeForUser: jest.fn().mockResolvedValue({ task, didArchive: false }),
    });
    const notificationService = makeNotificationService();
    const service = new CompleteTaskService(tasksRepo, notificationService);

    const result = await service.complete(1, 2);

    expect(tasksRepo.completeForUser).toHaveBeenCalledWith(1, 2);
    expect(notificationService.notifyArchived).not.toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Task participation marked as completed',
      task: detail,
    });
  });

  it('notifies once the task gets archived', async () => {
    const tasksRepo = makeTasksRepo({
      completeForUser: jest.fn().mockResolvedValue({ task, didArchive: true }),
    });
    const notificationService = makeNotificationService();
    const service = new CompleteTaskService(tasksRepo, notificationService);

    await service.complete(1, 2);

    expect(notificationService.notifyArchived).toHaveBeenCalledWith(task);
  });
});

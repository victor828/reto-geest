import { AssignTaskService } from './assign-task.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';

function makeTasksRepo(
  overrides: Partial<jest.Mocked<TasksRepositoryPort>> = {},
): jest.Mocked<TasksRepositoryPort> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findDetailById: jest.fn(),
    findAll: jest.fn(),
    assignUsers: jest.fn(),
    completeForUser: jest.fn(),
    findNotifications: jest.fn(),
    ...overrides,
  };
}

function makeUsersRepo(
  overrides: Partial<jest.Mocked<UsersRepositoryPort>> = {},
): jest.Mocked<UsersRepositoryPort> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findManyByIds: jest.fn(),
    findAllWithPendingTasks: jest.fn(),
    findUserTasks: jest.fn(),
    ...overrides,
  };
}

const task = {
  id: 1,
  title: 'T',
  description: null,
  status: 'open' as const,
  createdAt: new Date(),
  archivedAt: null,
};

describe('AssignTaskService', () => {
  it('assigns users once the task and all users exist', async () => {
    const tasksRepo = makeTasksRepo({
      findById: jest.fn().mockResolvedValue(task),
      assignUsers: jest.fn().mockResolvedValue({ assigned: [1, 2], unassigned: [] }),
    });
    const usersRepo = makeUsersRepo({
      findManyByIds: jest.fn().mockResolvedValue([
        { id: 1, name: 'A', lastName: 'B', email: 'a@x.com', createdAt: new Date() },
        { id: 2, name: 'C', lastName: 'D', email: 'c@x.com', createdAt: new Date() },
      ]),
    });
    const service = new AssignTaskService(tasksRepo, usersRepo);

    const result = await service.assign(1, [1, 2]);

    expect(tasksRepo.assignUsers).toHaveBeenCalledWith(1, [1, 2]);
    expect(result).toEqual({
      message: 'Task assignment updated',
      assigned: [1, 2],
      unassigned: [],
    });
  });

  it('throws TASK_NOT_FOUND when the task does not exist', async () => {
    const tasksRepo = makeTasksRepo({ findById: jest.fn().mockResolvedValue(null) });
    const usersRepo = makeUsersRepo();
    const service = new AssignTaskService(tasksRepo, usersRepo);

    await expect(service.assign(999, [1])).rejects.toMatchObject({
      response: { error: { code: 'TASK_NOT_FOUND' } },
    });
    expect(tasksRepo.assignUsers).not.toHaveBeenCalled();
  });

  it('throws USER_NOT_FOUND listing every missing user id', async () => {
    const tasksRepo = makeTasksRepo({ findById: jest.fn().mockResolvedValue(task) });
    const usersRepo = makeUsersRepo({
      findManyByIds: jest
        .fn()
        .mockResolvedValue([
          { id: 1, name: 'A', lastName: 'B', email: 'a@x.com', createdAt: new Date() },
        ]),
    });
    const service = new AssignTaskService(tasksRepo, usersRepo);

    await expect(service.assign(1, [1, 2, 3])).rejects.toMatchObject({
      response: { error: { code: 'USER_NOT_FOUND', message: expect.stringContaining('2, 3') } },
    });
    expect(tasksRepo.assignUsers).not.toHaveBeenCalled();
  });
});

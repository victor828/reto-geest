import { AppException } from 'src/modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from 'src/modules/commond/domain/exceptions/error-codes.enum';
import { UsersRepositoryPort } from 'src/modules/users/infrastructure/adapters/ports/users-repository.port';
import { CreateTaskService } from './create-task.service';
import { TasksRepositoryPort } from '../../../infrastructure/adapters/ports/tasks-repository.port';

describe('CreateTaskService', () => {
  const created = {
    id: 1,
    title: 'Write report',
    description: undefined,
    status: 'open' as const,
    createdAt: new Date(),
    archivedAt: null,
  };

  const makeRepo = () =>
    ({
      create: jest.fn().mockResolvedValue(created),
      assignUsers: jest.fn().mockResolvedValue({ assigned: [], unassigned: [] }),
    }) as unknown as jest.Mocked<TasksRepositoryPort>;

  const makeUsersRepo = (existingIds: number[] = []) =>
    ({
      findManyByIds: jest.fn().mockResolvedValue(existingIds.map((id) => ({ id }))),
    }) as unknown as jest.Mocked<UsersRepositoryPort>;

  it('delegates creation to the repository port when no userIds are given', async () => {
    const repo = makeRepo();
    const usersRepo = makeUsersRepo();
    const service = new CreateTaskService(repo, usersRepo);
    const dto = { title: 'Write report', description: undefined };

    const result = await service.create(dto);

    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.assignUsers).not.toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it('creates the task and assigns the given users', async () => {
    const repo = makeRepo();
    const usersRepo = makeUsersRepo([1, 2]);
    const service = new CreateTaskService(repo, usersRepo);
    const dto = { title: 'Write report', description: undefined, userIds: [1, 2] };

    const result = await service.create(dto);

    expect(usersRepo.findManyByIds).toHaveBeenCalledWith([1, 2]);
    expect(repo.create).toHaveBeenCalledWith({ title: 'Write report', description: undefined });
    expect(repo.assignUsers).toHaveBeenCalledWith(created.id, [1, 2]);
    expect(result).toEqual(created);
  });

  it('throws USER_NOT_FOUND and does not create the task when a userId does not exist', async () => {
    const repo = makeRepo();
    const usersRepo = makeUsersRepo([1]);
    const service = new CreateTaskService(repo, usersRepo);
    const dto = { title: 'Write report', description: undefined, userIds: [1, 2] };

    await expect(service.create(dto)).rejects.toMatchObject(
      new AppException(404, ErrorCode.USER_NOT_FOUND, 'User(s) not found: 2'),
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.assignUsers).not.toHaveBeenCalled();
  });
});

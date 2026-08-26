import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { UsersRepositoryPort } from '../ports/users-repository.port';
import { RegisterRequestDto } from 'src/modules/auth/application/dtos/register-request.dto';
import { UsersEntity } from 'src/modules/users/domain/entities/users.entity';
import { PaginatedResultDto } from 'src/modules/commond/application/dtos/paginated-result.dto';
import { UsersFindAllQueryDto, UsersSortableField } from 'src/modules/users/application/dtos/users-find-all-query.dto';
import { UsersUpdateRequestDto } from 'src/modules/users/application/dtos/users-update-request.dto';
import { ErrorsUseCase } from 'src/modules/commond/application/use-cases/errors.use-case';

@Injectable()
export class UsersRepositoryImpl implements UsersRepositoryPort {
  constructor(private readonly prisma: PrismaService) { }
  async create(user: RegisterRequestDto): Promise<UsersEntity> {
    const newUser = await this.prisma.user.create({
      data: {
        email: user.email,
        fullName: user.name,
        passwordHash: user.password,
        avatarUrl:
          user.avatarUrl ??
          'https://as2.ftcdn.net/v2/jpg/05/76/65/21/1000_F_576652189_WK1JiTOwjKCFIJDJJLI1Q6RtwSfpgspu.jpg',
        createdAt: new Date(),
      },
    });
    if (!newUser) throw new InternalServerErrorException();

    return newUser;
  }

  async findById(id: string): Promise<any> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }
  }

  async findByEmail(email: string): Promise<any> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
  }

  async findByEmailNoValidate(email: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user;
  }

  async findAll(query: UsersFindAllQueryDto): Promise<PaginatedResultDto<UsersEntity>> {
    const { page, limit, sortBy, order } = query;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy as UsersSortableField]: order },
      }),
      this.prisma.user.count(),
    ]);

    return new PaginatedResultDto(data, total, page, limit);
  }

  async update(id: string, user: UsersUpdateRequestDto): Promise<any> {
    await this.findById(id)
    try {
      return await this.prisma.user.update({
        data: { ...user },
        where: { id },
        select: {
          id: true,
          updatedAt: true
        }
      });
    } catch (error) {
      ErrorsUseCase.setError(error)
    }
  }

  async delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

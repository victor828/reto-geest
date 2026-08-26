import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { AuthRepositoryPort } from '../ports/auth-repository.port';

@Injectable()
export class AuthRepositoryImpl {
  // Implement the user creation logic here
  constructor(private readonly repository: PrismaService) {}
}

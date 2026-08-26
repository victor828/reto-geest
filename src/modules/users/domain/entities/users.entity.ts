import { Role } from 'src/generated/prisma/enums';

export class UsersEntity {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  roles: Role[];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

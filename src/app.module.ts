import { SeedModule } from './modules/seed/config/seed.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './modules/users/config/users.module';
import { AuthModule } from './modules/auth/config/auth.module';
import { PrismaModule } from './db/prisma.module';
import { CommondModule } from './modules/commond/commond.module';

@Module({
  imports: [
    CommondModule,
    SeedModule,
    AuthModule,
    UsersModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

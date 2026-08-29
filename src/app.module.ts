import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './modules/users/config/users.module';
import { TasksModule } from './modules/tasks/config/tasks.module';
import { PrismaModule } from './db/prisma.module';
import { QueueModule } from './queue/queue.module';
import { CommondModule } from './modules/commond/commond.module';
import { DevNotificationsModule } from './modules/dev-notifications/dev-notifications.module';

// Utilidad de solo-desarrollo (ver dev-notifications.controller.ts): no se registra cuando STAGE=prod
// para no exponerla en el despliegue público evaluado.
const devOnlyModules = process.env.STAGE === 'prod' ? [] : [DevNotificationsModule];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get<string>('THROTTLE_TTL_MS') ?? '10000'),
            limit: Number(config.get<string>('THROTTLE_LIMIT') ?? '30'),
          },
        ],
      }),
    }),
    CommondModule,
    UsersModule,
    TasksModule,
    PrismaModule,
    QueueModule,
    ...devOnlyModules,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

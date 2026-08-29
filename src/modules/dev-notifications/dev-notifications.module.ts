import { Module } from '@nestjs/common';
import { DevNotificationsController } from './dev-notifications.controller';

@Module({
  controllers: [DevNotificationsController],
})
export class DevNotificationsModule {}

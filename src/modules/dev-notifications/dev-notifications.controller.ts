import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';

interface IncomingNotifyPayload {
  taskId: number;
  title: string;
  archivedAt: string;
}

/**
 * Utilidad de desarrollo, NO parte del contrato de endpoints del reto: receptor de webhooks para
 * poder apuntar NOTIFY_URL a esta misma API (loopback) y ver en consola las notificaciones reales
 * que se envían al archivar una tarea, sin depender de un sistema externo real ni de mocks de test.
 * Registrado solo cuando STAGE !== 'prod' (ver app.module.ts).
 */
@Controller('dev/notifications-received')
export class DevNotificationsController {
  private readonly logger = new Logger('DevNotificationReceiver');

  @Post()
  @HttpCode(200)
  receive(@Body() payload: IncomingNotifyPayload) {
    this.logger.log(`Received notification: ${JSON.stringify(payload)}`);
    return { received: true };
  }
}

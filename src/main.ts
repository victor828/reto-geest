import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppException } from './modules/commond/domain/exceptions/app.exception';
import { ErrorCode } from './modules/commond/domain/exceptions/error-codes.enum';
import { HttpExceptionFilter } from './modules/commond/infrastructure/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const message = errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join(', ');
        return new AppException(400, ErrorCode.VALIDATION_ERROR, message || 'Invalid request body');
      },
    }),
  );
  app.enableCors({
    origin: 'https://geest_frontend.veom.lat',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const config = new DocumentBuilder()
    .setTitle(process.env.PROYECT_NAME ?? 'RETO GEEST — API de gestión de tareas')
    .setDescription('API REST para asignación y seguimiento de tareas por usuario')
    .setVersion('1.0')
    .addTag('Users')
    .addTag('Tasks')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000, () => {
    if (process.env.STAGE === 'dev') {
      console.log(`Server is running on port http://localhost:${process.env.PORT ?? 3000}`);
    } else {
      console.log(`
        <div>
          <h1>Welcome to Template Nest JS!</h1>
          <h2>Autor: Victor Orozco</h2>

          <p>The project has been Start, ENJOY!</p>
        </div>
      `);
    }
  });
}
bootstrap();

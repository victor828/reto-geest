import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // @WebSocketGateway({ cors: true }); // Socket

  // app.useGlobalFilters(new Filtro1, …);
  // app.useGlobalGuards(new Guard1, …);
  // app.useGlobalInterceptors(new Inter1, …);
  // app.useGlobalPipes(new Pipe1, …);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const config = new DocumentBuilder()
    .setTitle(process.env.PROYECT_NAME ?? "Proyecto")
    .setDescription('Templade Docs')
    .setVersion('1.0')
    .addTag('Template')
    .addBearerAuth()
    .build()

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

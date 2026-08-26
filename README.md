## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Copyright and usage

Copyright (c) 2026 Victor Eduardo Orozco Martinez. All rights reserved.

This project is private and proprietary. No permission is granted to copy,
modify, distribute, sublicense, publish, or use this code or any part of it
without prior written authorization from the copyright holder. See the
[`LICENSE`](LICENSE) file for the complete terms.

## Prisma

```bash
$ pnpm dlx prisma@latest init
```

## Project setup

```bash
$ pnpm install
```

Copiar y crear el .env

```bash
cp .env.example .env
```

o .env.development.local y .env.production.local usa el comando siguiente. todo depende como lo
quieras manejar pero es mas facil el .env

```bash
cp .env.example .env.development.local && cp .env.example .env.production.local
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## DB Prisma

Generar un nueva migracion

```shell
pnpm prisma migrate dev --name <name>
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Migrations

```sh
npx prisma migrate deploy //(Desarrollo) Realiza la migracion.
o
npx migrate dev //(produccion) Genera una nueva migracion.

npx prisma db push //(prototipado) Sincroniza la BD directamente con el schema deja cero hostorial, puede pedir --accept-data-loss si un cambio destruye columnas
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can
take to ensure it runs as efficiently as possible. Check out the
[deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out
[Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau
makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building
features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video
  [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few
  clicks.
- Visualize your application graph and interact with the NestJS application in real-time using
  [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official
  [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and
  [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official
  [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the
amazing backers. If you'd like to join them, please
[read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

This project is proprietary software and is distributed under the terms in the
[`LICENSE`](LICENSE) file. The NestJS framework and other third-party
dependencies remain subject to their own licenses; this notice applies to the
original code in this repository.

# Lsita para terminar el Template

- [ ] Configuracion de la base de datos
- [ ] Auth
- [ ] Users

```

```

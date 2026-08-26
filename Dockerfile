# syntax=docker/dockerfile:1

##########################
# Base: archivos comunes #
##########################
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./


##########################
# Deps: install completo #
# (incluye devDeps, se   #
# usa para dev y test)   #
##########################
FROM base AS deps
RUN pnpm install --frozen-lockfile


##########################
# Dev: hot reload        #
##########################
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]


##########################
# Build: compila TS      #
# (mantiene devDeps, se  #
# usa para correr tests) #
##########################
FROM deps AS build
COPY . .
RUN pnpm run build


##########################
# Prod-deps: solo deps   #
# de producción          #
##########################
FROM base AS prod-deps
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod


##########################
# Prod: runtime liviano  #
##########################
FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/prisma.config.ts ./
COPY --from=build --chown=nestjs:nodejs /app/package.json ./

USER nestjs
EXPOSE 3000
CMD ["node", "dist/main"]

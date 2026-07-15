FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/

RUN npm install --workspace=apps/api --workspace=packages/*

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY . .

RUN npm run build --workspace=packages/*
RUN npm run build --workspace=apps/api

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/packages/*/node_modules ./packages/
COPY --from=builder /app/packages/*/package.json ./packages/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]

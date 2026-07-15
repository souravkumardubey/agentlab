FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/ws/package.json ./apps/ws/
COPY packages/*/package.json ./packages/

RUN npm install --workspace=apps/ws --workspace=packages/*

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ws/node_modules ./apps/ws/node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY . .

RUN npm run build --workspace=packages/*
RUN npm run build --workspace=apps/ws

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/ws/dist ./apps/ws/dist
COPY --from=builder /app/apps/ws/node_modules ./apps/ws/node_modules
COPY --from=builder /app/apps/ws/package.json ./apps/ws/
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/packages/*/node_modules ./packages/
COPY --from=builder /app/packages/*/package.json ./packages/
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3002

CMD ["node", "apps/ws/dist/index.js"]

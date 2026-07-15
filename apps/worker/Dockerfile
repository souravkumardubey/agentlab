FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/*/package.json ./packages/

RUN npm install --workspace=apps/worker --workspace=packages/*

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/
COPY . .

RUN npm run build --workspace=packages/*
RUN npm run build --workspace=apps/worker

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder /app/apps/worker/package.json ./apps/worker/
COPY --from=builder /app/packages/*/dist ./packages/
COPY --from=builder /app/packages/*/node_modules ./packages/
COPY --from=builder /app/packages/*/package.json ./packages/
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "apps/worker/dist/index.js"]

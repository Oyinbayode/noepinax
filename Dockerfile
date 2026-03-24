FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY packages/agent/package.json packages/agent/

RUN pnpm install --frozen-lockfile

# Copy source and build in dependency order
COPY packages/shared/ packages/shared/
RUN pnpm --filter @noepinax/shared build

COPY packages/api/ packages/api/
RUN pnpm --filter @noepinax/api build

COPY packages/agent/ packages/agent/
RUN pnpm --filter @noepinax/agent build

# Copy entrypoint
COPY scripts/start.mjs scripts/start.mjs

ENV NODE_ENV=production
ENV API_PORT=10000
ENV API_URL=http://localhost:10000

EXPOSE 10000

CMD ["node", "scripts/start.mjs"]

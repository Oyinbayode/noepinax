FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Workspace config and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/

# --filter=!@noepinax/agent skips installing agent deps in this image — agents
# now ship in Dockerfile.agents and run on GCE.
RUN pnpm install --frozen-lockfile --filter=@noepinax/api... --filter=@noepinax/shared

# Build shared then API
COPY packages/shared/ packages/shared/
RUN pnpm --filter @noepinax/shared build

COPY packages/api/ packages/api/
RUN pnpm --filter @noepinax/api build

COPY scripts/start.mjs scripts/start.mjs

ENV NODE_ENV=production

# Cloud Run injects PORT at runtime (default 8080)
EXPOSE 8080

CMD ["node", "scripts/start.mjs"]

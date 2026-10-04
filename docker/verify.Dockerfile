# Раннер полной регрессионной проверки (§15.1 ТЗ)
FROM node:22-bookworm-slim

RUN corepack enable
WORKDIR /repo

# Сначала манифесты — слой с зависимостями кэшируется
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/game-core/package.json packages/game-core/
COPY tests/rules/package.json tests/rules/
RUN pnpm install --frozen-lockfile

COPY . .
CMD ["bash", "scripts/verify.sh"]

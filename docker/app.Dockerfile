# Окружение проверки (§15.1): один образ для эмуляторов Firebase и раннера тестов.
# Внутри: Node, Java (эмуляторы Firestore/RTDB), firebase-tools, браузеры Playwright,
# зависимости монорепозитория, собранные пакеты, Cloud Functions и web-клиент (Expo for Web).
FROM mcr.microsoft.com/playwright:v1.63.0-noble

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-21-jre-headless curl \
  && rm -rf /var/lib/apt/lists/*

ARG FIREBASE_TOOLS_VERSION=15.32.1
RUN npm install -g firebase-tools@${FIREBASE_TOOLS_VERSION} \
  && firebase setup:emulators:firestore \
  && firebase setup:emulators:database \
  && firebase setup:emulators:storage

ARG PNPM_VERSION=10.33.2
RUN npm install -g pnpm@${PNPM_VERSION}
ENV CI=true EXPO_NO_TELEMETRY=1
WORKDIR /repo

# Сначала манифесты — слой с зависимостями кэшируется
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/game-core/package.json packages/game-core/
COPY packages/shared/package.json packages/shared/
COPY packages/i18n/package.json packages/i18n/
COPY packages/assets/package.json packages/assets/
COPY functions/package.json functions/
COPY apps/client/package.json apps/client/
COPY tests/rules/package.json tests/rules/
COPY tests/functions/package.json tests/functions/
COPY tests/e2e/package.json tests/e2e/
RUN pnpm install --frozen-lockfile

COPY . .
# Пакеты и функции собираются для эмулятора; web-клиент — для Hosting-эмулятора (порт 5000)
RUN pnpm build \
  && pnpm --filter @hb/client setup:web \
  && pnpm --filter @hb/client export:web

CMD ["bash", "scripts/verify.sh"]

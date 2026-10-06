# Heroes Battles

Пошаговая тактическая PvP-игра (web, iOS, Android) на TypeScript и Firebase. Требования — [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md).

## Структура

```
apps/client/          — клиент на Expo (iOS, Android, Web): экраны, бой с ботом на Skia
functions/            — Cloud Functions: createHero, allocatePoint, upgradeGuest
packages/game-core/   — игровая логика: юниты, заклинания, бой, балансировка, прогрессия, боты
packages/shared/      — типы документов Firestore и callable-функций
packages/i18n/        — строки интерфейса и названия игровых сущностей (en, ru)
packages/assets/      — SVG-спрайты юнитов и палитры рас
tests/rules/          — тесты Security Rules (в эмуляторе Firebase)
tests/functions/      — интеграционные тесты Cloud Functions (в эмуляторе)
tests/e2e/            — e2e-сценарии web-клиента (Playwright)
docker/               — окружение проверки: эмуляторы Firebase + web-клиент + раннер тестов
scripts/verify.sh     — полная регрессионная проверка
firestore.rules, database.rules.json, storage.rules — правила доступа
```

## Разработка

Требуется Node 22+, pnpm 10 и Docker.

```bash
pnpm install
pnpm build        # сборка пакетов и функций
pnpm typecheck    # проверка типов
pnpm test         # юнит-тесты
```

## Поиграть локально

Эмуляторы Firebase и собранный web-клиент поднимаются одной командой — реальный Firebase-проект не нужен:

```bash
pnpm emulators    # затем открыть http://localhost:5000
```

Разработка клиента с горячей перезагрузкой (эмуляторы должны быть запущены):

```bash
pnpm --filter @hb/client setup:web   # один раз: CanvasKit для Skia на web
pnpm --filter @hb/client web         # http://localhost:8081
```

На устройстве или симуляторе клиент ищет эмуляторы по адресу из `EXPO_PUBLIC_EMULATOR_HOST` (по умолчанию `localhost`, в эмуляторе Android — `10.0.2.2`). Для реального проекта задаются `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_APP_ID`.

## Проверка этапа (§15.1 ТЗ)

После каждого крупного этапа прогоняется полная проверка всего готового функционала:

```bash
pnpm verify                                   # эмуляторы + сборка + типы + тесты + rules + функции + сборка iOS/Android + e2e
docker compose -f docker/compose.yml down -v  # остановить окружение
```

Скриншоты и трейсы упавших e2e-сценариев — в `tests/e2e/test-results/`.

## Графика

Спрайты — SVG в `packages/assets` (viewBox 100×100, юнит смотрит вправо). Нарисованы некроманты — эталон стиля; остальные расы пока показываются жетонами в цветах расы. Лист предпросмотра расы для ревью:

```bash
pnpm --filter @hb/assets preview --race necro --out preview-necro.png
```

## Прогон боёв ботов

Массовый прогон боёв бот против бота: стабильность движка, равенство сторон, сила Normal против Easy, доля побед по расам.

```bash
pnpm --filter @hb/game-core simulate                          # 100 боёв на режим в каждой серии (600 всего, ~1.5 мин)
pnpm --filter @hb/game-core simulate --battles 500 --seed 42  # больше боёв, другой seed
pnpm --filter @hb/game-core simulate --modes 1v1              # только один режим
```

Результат детерминирован при одинаковом seed. Код выхода 1 — был сбой или не выполнен критерий (`--min-normal`, по умолчанию 0.7).

## Баланс рас и юнитов

```bash
pnpm --filter @hb/game-core balance                     # матрица «раса против расы», 200 боёв на пару (~1 мин)
pnpm --filter @hb/game-core balance --battles 400 --seed 2
pnpm --filter @hb/game-core units                       # эффективность каждого юнита за свой вес (~3 мин)
```

`balance` проверяет целевой баланс рас (§13 ТЗ): разброс ≤ 20 п.п., слабейшая раса бьёт сильнейшую, цикл через все расы. `units` показывает юнитов, которые сильнее или слабее своего веса, — по нему правятся цены в `src/data/power.ts` и поправки в `src/data/calibration.ts`.

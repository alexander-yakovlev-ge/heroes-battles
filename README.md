# Heroes Battles

Пошаговая тактическая PvP-игра (web, iOS, Android) на TypeScript и Firebase. Требования — [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md).

## Структура

```
packages/game-core/   — игровая логика: юниты, заклинания, бой, балансировка, прогрессия, боты
tests/rules/          — тесты Security Rules (в эмуляторе Firebase)
docker/               — окружение проверки: эмуляторы Firebase + раннер
scripts/verify.sh     — полная регрессионная проверка
firestore.rules, database.rules.json, storage.rules — правила доступа
```

## Разработка

Требуется Node 22+, pnpm 10 и Docker.

```bash
pnpm install
pnpm build        # сборка пакетов
pnpm typecheck    # проверка типов
pnpm test         # юнит-тесты
```

## Проверка этапа (§15.1 ТЗ)

После каждого крупного этапа прогоняется полная проверка всего готового функционала:

```bash
pnpm verify                                   # эмуляторы + сборка + типы + тесты + rules
docker compose -f docker/compose.yml down -v  # остановить окружение
```

Эмуляторы работают в demo-режиме (`demo-heroes-battles`) — реальный Firebase-проект не нужен.

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

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

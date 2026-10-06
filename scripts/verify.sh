#!/usr/bin/env bash
# Полная регрессионная проверка всего готового функционала (§15.1 ТЗ).
# Запускается в контейнере verify: pnpm verify (из корня репозитория).
set -uo pipefail

declare -a RESULTS=()
failed=0

step() {
  local name="$1"
  shift
  echo
  echo "━━━ ${name} ━━━"
  local start=$SECONDS
  if "$@"; then
    RESULTS+=("PASS  ${name} ($((SECONDS - start))s)")
  else
    RESULTS+=("FAIL  ${name} ($((SECONDS - start))s)")
    failed=1
  fi
}

step "Сборка пакетов и функций" pnpm build
step "Проверка типов" pnpm typecheck
step "Юнит-тесты (game-core, i18n, assets, client)" pnpm test
step "Тесты Security Rules в эмуляторе" pnpm test:rules
step "Интеграционные тесты Cloud Functions" pnpm test:functions
step "Сборка мобильных клиентов (expo export ios/android)" pnpm --filter @hb/client export:native
step "e2e web-клиента (Playwright)" pnpm test:e2e

echo
echo "━━━ Итог проверки ━━━"
printf '%s\n' "${RESULTS[@]}"
exit $failed

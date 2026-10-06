import type { ErrorCode } from '@hb/shared'

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'auth.errInvalidEmail',
  'auth/missing-email': 'auth.errInvalidEmail',
  'auth/invalid-credential': 'auth.errWrongCredentials',
  'auth/wrong-password': 'auth.errWrongCredentials',
  'auth/user-not-found': 'auth.errWrongCredentials',
  'auth/missing-password': 'auth.errWeakPassword',
  'auth/email-already-in-use': 'auth.errEmailInUse',
  'auth/credential-already-in-use': 'auth.errEmailInUse',
  'auth/weak-password': 'auth.errWeakPassword',
  'auth/too-many-requests': 'auth.errTooMany',
  'auth/network-request-failed': 'common.offline',
  'functions/unavailable': 'common.offline',
}

/** Ключ локализации для ошибки Firebase Auth / callable-функции */
export function errorKey(error: unknown): string {
  const e = error as { code?: string; details?: { code?: ErrorCode } }
  if (e?.details?.code) return `error.${e.details.code}`
  if (e?.code && AUTH_ERRORS[e.code]) return AUTH_ERRORS[e.code]!
  return 'common.errorGeneric'
}

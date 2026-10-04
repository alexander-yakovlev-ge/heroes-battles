import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, describe, it } from 'vitest'

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':')

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-heroes-battles',
    firestore: {
      host: host!,
      port: Number(port),
      rules: readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8'),
    },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

describe('firestore.rules (этап 1: всё закрыто)', () => {
  it('аноним не может читать и писать', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/u1')))
    await assertFails(setDoc(doc(db, 'users/u1'), { displayName: 'x' }))
  })

  it('авторизованный пользователь не может писать даже в свои документы', async () => {
    const db = env.authenticatedContext('u1').firestore()
    await assertFails(setDoc(doc(db, 'users/u1'), { displayName: 'x' }))
    await assertFails(setDoc(doc(db, 'battles/b1'), { status: 'active' }))
  })
})

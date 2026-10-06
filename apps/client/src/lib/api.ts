import { httpsCallable } from 'firebase/functions'
import {
  CALLABLES,
  type AllocatePointRequest,
  type CreateHeroRequest,
  type HeroResponse,
  type UpgradeGuestRequest,
} from '@hb/shared'
import { functions } from './firebase'

/** Обёртки над callable-функциями (§3.3) */
export const api = {
  createHero: (req: CreateHeroRequest) =>
    httpsCallable<CreateHeroRequest, HeroResponse>(functions, CALLABLES.createHero)(req).then((r) => r.data),
  allocatePoint: (req: AllocatePointRequest) =>
    httpsCallable<AllocatePointRequest, HeroResponse>(functions, CALLABLES.allocatePoint)(req).then((r) => r.data),
  upgradeGuest: (req: UpgradeGuestRequest) =>
    httpsCallable<UpgradeGuestRequest, HeroResponse>(functions, CALLABLES.upgradeGuest)(req).then((r) => r.data),
}

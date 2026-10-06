import { memo } from 'react'
import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import type { RaceId } from '@hb/game-core'
import { RACE_PALETTES, heroIconSvg } from '@hb/assets'

/** Портрет героя в цветах стартовой расы */
export const HeroIcon = memo(function HeroIcon({ race, size = 48 }: { race: RaceId; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 6, borderWidth: 2, borderColor: RACE_PALETTES[race].accent, overflow: 'hidden' }}
    >
      <SvgXml xml={heroIconSvg(race)} width="100%" height="100%" />
    </View>
  )
})

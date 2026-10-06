import { memo } from 'react'
import { View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { getUnit } from '@hb/game-core'
import { RACE_PALETTES, unitIconSvg } from '@hb/assets'
import { colors } from '../theme'

/** Иконка юнита в рамке цвета расы (§10.1); locked — затемнена */
export const UnitIcon = memo(function UnitIcon({ unitId, size = 48, locked }: { unitId: string; size?: number; locked?: boolean }) {
  const pal = RACE_PALETTES[getUnit(unitId).raceId]
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 6,
        borderWidth: 2,
        borderColor: locked ? colors.disabled : pal.primary,
        backgroundColor: pal.dark,
        overflow: 'hidden',
        opacity: locked ? 0.5 : 1,
      }}
    >
      <SvgXml xml={unitIconSvg(unitId)} width="100%" height="100%" />
    </View>
  )
})

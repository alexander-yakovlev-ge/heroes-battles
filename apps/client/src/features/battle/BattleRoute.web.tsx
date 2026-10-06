import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web'
import { Loading } from '../../components/ui'

/**
 * Web: CanvasKit (WASM, ~7 МБ) загружается лениво — только при входе в бой (§16),
 * и только потом подгружается модуль экрана, использующий Skia.
 */
export default function BattleRoute() {
  return (
    <WithSkiaWeb
      getComponent={() => import('./BattleScreen')}
      fallback={<Loading />}
      opts={{ locateFile: (file: string) => `/${file}` }}
    />
  )
}

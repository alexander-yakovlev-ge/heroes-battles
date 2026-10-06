import { Skia, type SkImage } from '@shopify/react-native-skia'
import { getUnitArt } from '@hb/assets'

/** Разрешение растра спрайта: крупный юнит занимает 2×2 клетки, на экранах с высокой плотностью ~120 px на клетку */
export const SPRITE_PX = 256

const cache = new Map<string, Promise<SkImage | null>>()

/** iOS/Android: SVG рисуется во внеэкранную поверхность один раз, дальше на поле — готовое изображение */
function rasterize(templateId: string): SkImage | null {
  const svg = Skia.SVG.MakeFromString(getUnitArt(templateId).svg)
  const surface = Skia.Surface.MakeOffscreen(SPRITE_PX, SPRITE_PX)
  if (!svg || !surface) return null
  surface.getCanvas().drawSvg(svg, SPRITE_PX, SPRITE_PX)
  surface.flush()
  return surface.makeImageSnapshot().makeNonTextureImage()
}

export function loadSprite(templateId: string): Promise<SkImage | null> {
  let p = cache.get(templateId)
  if (!p) {
    p = Promise.resolve(rasterize(templateId))
    cache.set(templateId, p)
  }
  return p
}

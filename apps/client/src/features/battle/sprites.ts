import { Skia, type SkImage } from '@shopify/react-native-skia'
import { getUnitArt } from '@hb/assets'
import { layerSvg, type RigImages } from './rig'

/** Разрешение растра спрайта: крупный юнит 2×2 на экране с плотностью ×3 занимает ~450 px — берём с запасом, чтобы не терять детали */
export const SPRITE_PX = 512

const cache = new Map<string, Promise<SkImage | null>>()
const rigCache = new Map<string, Promise<RigImages | null>>()

/** iOS/Android: SVG рисуется во внеэкранную поверхность один раз, дальше на поле — готовое изображение */
function rasterize(svgText: string, w: number, h: number): SkImage | null {
  const svg = Skia.SVG.MakeFromString(svgText)
  const surface = Skia.Surface.MakeOffscreen(w, h)
  if (!svg || !surface) return null
  surface.getCanvas().drawSvg(svg, w, h)
  surface.flush()
  return surface.makeImageSnapshot().makeNonTextureImage()
}

export function loadSprite(templateId: string): Promise<SkImage | null> {
  let p = cache.get(templateId)
  if (!p) {
    p = Promise.resolve(rasterize(getUnitArt(templateId).svg, SPRITE_PX, SPRITE_PX))
    cache.set(templateId, p)
  }
  return p
}

/** Слои рига: каждый растрируется только в своей рамке (экономия памяти) */
export function loadRig(templateId: string): Promise<RigImages | null> {
  let p = rigCache.get(templateId)
  if (!p) {
    const rig = getUnitArt(templateId).rig
    p = Promise.resolve(
      rig
        ? {
            ...rig,
            layers: rig.layers.map((l) => {
              const { svg, w, h } = layerSvg(l, SPRITE_PX)
              return { bone: l.bone, box: l.box, image: rasterize(svg, w, h) }
            }),
          }
        : null,
    )
    rigCache.set(templateId, p)
  }
  return p
}

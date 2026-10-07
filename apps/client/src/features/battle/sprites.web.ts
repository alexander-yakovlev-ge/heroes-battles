import { Skia, type SkImage } from '@shopify/react-native-skia'
import { getUnitArt } from '@hb/assets'
import { layerSvg, type RigImages } from './rig'

export const SPRITE_PX = 512

const cache = new Map<string, Promise<SkImage | null>>()
const rigCache = new Map<string, Promise<RigImages | null>>()

/**
 * Web: CanvasKit не растеризует SVG сам — браузер декодирует SVG в <img> нужного размера,
 * из него один раз создаётся изображение Skia (без пересоздания текстуры на каждом кадре).
 */
async function rasterize(svgText: string, w: number, h: number): Promise<SkImage | null> {
  const svg = svgText.replace('<svg ', `<svg width="${w}" height="${h}" `)
  const img = new Image(w, h)
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  try {
    await img.decode()
  } catch {
    return null
  }
  const bitmap = await createImageBitmap(img, { resizeWidth: w, resizeHeight: h })
  return Skia.Image.MakeImageFromNativeBuffer(bitmap)
}

export function loadSprite(templateId: string): Promise<SkImage | null> {
  let p = cache.get(templateId)
  if (!p) {
    p = rasterize(getUnitArt(templateId).svg, SPRITE_PX, SPRITE_PX)
    cache.set(templateId, p)
  }
  return p
}

export function loadRig(templateId: string): Promise<RigImages | null> {
  let p = rigCache.get(templateId)
  if (!p) {
    const rig = getUnitArt(templateId).rig
    p = rig
      ? Promise.all(
          rig.layers.map(async (l) => {
            const { svg, w, h } = layerSvg(l, SPRITE_PX)
            return { bone: l.bone, box: l.box, image: await rasterize(svg, w, h) }
          }),
        ).then((layers) => ({ ...rig, layers }))
      : Promise.resolve(null)
    rigCache.set(templateId, p)
  }
  return p
}

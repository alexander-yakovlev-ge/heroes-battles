import { Skia, type SkImage } from '@shopify/react-native-skia'
import { getUnitArt } from '@hb/assets'

export const SPRITE_PX = 256

const cache = new Map<string, Promise<SkImage | null>>()

/**
 * Web: CanvasKit не растеризует SVG сам — браузер декодирует SVG в <img> нужного размера,
 * из него один раз создаётся изображение Skia (без пересоздания текстуры на каждом кадре).
 */
async function rasterize(templateId: string): Promise<SkImage | null> {
  const svg = getUnitArt(templateId).svg.replace('<svg ', `<svg width="${SPRITE_PX}" height="${SPRITE_PX}" `)
  const img = new Image(SPRITE_PX, SPRITE_PX)
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  try {
    await img.decode()
  } catch {
    return null
  }
  const bitmap = await createImageBitmap(img, { resizeWidth: SPRITE_PX, resizeHeight: SPRITE_PX })
  return Skia.Image.MakeImageFromNativeBuffer(bitmap)
}

export function loadSprite(templateId: string): Promise<SkImage | null> {
  let p = cache.get(templateId)
  if (!p) {
    p = rasterize(templateId)
    cache.set(templateId, p)
  }
  return p
}

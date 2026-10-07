import type { SkImage } from '@shopify/react-native-skia'
import type { Bone, Rig, RigLayer } from '@hb/assets'

/** Риг, растрированный для поля: изображение на каждый слой */
export interface RigImages extends Omit<Rig, 'layers'> {
  layers: { bone: Bone; box: RigLayer['box']; image: SkImage | null }[]
}

/** SVG слоя, обрезанный по его рамке, и размер растра в пикселях (spritePx — растр всего спрайта 100×100) */
export function layerSvg(layer: Pick<RigLayer, 'svg' | 'box'>, spritePx: number): { svg: string; w: number; h: number } {
  const [x, y, w, h] = layer.box
  return {
    svg: layer.svg.replace('viewBox="0 0 100 100"', `viewBox="${x} ${y} ${w} ${h}"`),
    w: Math.max(1, Math.round((w / 100) * spritePx)),
    h: Math.max(1, Math.round((h / 100) * spritePx)),
  }
}

import { Resvg } from '@resvg/resvg-js'

/** Рамка слоя [x, y, w, h] в координатах спрайта: границы рисунка с запасом на сглаживание, шаг 0.5 */
export function layerBox(svg) {
  const b = new Resvg(svg).getBBox()
  if (!b || !(b.width > 0)) return [0, 0, 1, 1]
  const pad = 1
  const x = Math.floor((b.x - pad) * 2) / 2
  const y = Math.floor((b.y - pad) * 2) / 2
  const w = Math.ceil((b.x + b.width + pad - x) * 2) / 2
  const h = Math.ceil((b.y + b.height + pad - y) * 2) / 2
  return [x, y, w, h]
}

export interface UnitArt {
  /** Спрайт: SVG с viewBox 0 0 100 100, юнит смотрит вправо, «земля» у нижнего края */
  svg: string
  /** Область спрайта для иконки (портрет), формат атрибута viewBox */
  iconViewBox: string
  /** Временный жетон вместо нарисованного юнита */
  placeholder: boolean
}

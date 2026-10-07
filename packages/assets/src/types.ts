/** Кость рига: часть спрайта, которая поворачивается вокруг своего шарнира */
export type Bone = 'root' | 'head' | 'armFar' | 'armNear' | 'legFar' | 'legNear' | 'legFar2' | 'legNear2' | 'wingFar' | 'wingNear' | 'tail'

/** Как юнит перемещается: шагом, галопом (четыре ноги), на крыльях, паря без шагов */
export type Motion = 'walk' | 'gallop' | 'fly' | 'float'

/** Чем бьёт: рубящий замах, укол, удар когтями, выстрел из лука, заклинание, укус */
export type Attack = 'swing' | 'thrust' | 'claw' | 'bow' | 'cast' | 'bite'

/** Слой рига: кусок спрайта на одной кости, box — его границы в координатах спрайта [x, y, w, h] */
export interface RigLayer {
  bone: Bone
  /** SVG слоя с viewBox 0 0 100 100 (только нужные ему градиенты) */
  svg: string
  box: readonly [number, number, number, number]
}

/** Риг юнита: слои в порядке отрисовки и шарниры костей (в координатах спрайта 0..100) */
export interface Rig {
  layers: readonly RigLayer[]
  pivots: Partial<Record<Bone, readonly [number, number]>>
  motion: Motion
  attack: Attack
}

export interface UnitArt {
  /** Спрайт: SVG с viewBox 0 0 100 100, юнит смотрит вправо, «земля» у нижнего края */
  svg: string
  /** Область спрайта для иконки (портрет), формат атрибута viewBox */
  iconViewBox: string
  /** Временный жетон вместо нарисованного юнита */
  placeholder: boolean
  /** Риг для анимации частей (ноги, руки, крылья); нет — спрайт анимируется целиком */
  rig?: Rig
}

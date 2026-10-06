/** Вес для отображения: до десятых, без хвоста .0 */
export const fmtWeight = (w: number) => (Math.round(w * 10) / 10).toString()

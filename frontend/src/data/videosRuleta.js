/**
 * Datos de la ruleta de videos.
 *
 * // REEMPLAZAR POR LOS VIDEOS REALES
 *
 * - id        : lo que va después de "watch?v=" o de "youtu.be/"
 * - titulo    : se muestra en la tarjeta y en el panel lateral
 * - categoria : etiqueta corta (se muestra en la tarjeta y bajo el año)
 * - anio      : número, se muestra en grande junto al título
 *
 * La miniatura se arma sola con el id:
 *   https://img.youtube.com/vi/<id>/hqdefault.jpg
 */
export const VIDEOS_RULETA = [
  // ——— Ejemplos: cortos abiertos de Blender ———
  { id: 'aqz-KE-bpKQ', titulo: 'Big Buck Bunny',    categoria: 'Open Movie', anio: 2008 },
  { id: 'eRsGyueVLvQ', titulo: 'Sintel',            categoria: 'Open Movie', anio: 2010 },
  { id: 'R6MlUcmOul8', titulo: 'Tears of Steel',    categoria: 'Sci-Fi',     anio: 2012 },
  { id: 'TLkA0RELQ1g', titulo: 'Elephants Dream',   categoria: 'Surreal',    anio: 2006 },
  { id: 'Y-rmzh0PI3c', titulo: 'Cosmos Laundromat', categoria: 'Pilot',      anio: 2015 },
  { id: 'WhWc3b3KhnY', titulo: 'Spring',            categoria: 'Fantasy',    anio: 2019 }
];

import { BrandSummary } from '../types/catalog';

export function CatalogStatus({ brands, loaded }: { brands: BrandSummary[]; loaded: number }) {
  const reported = brands.reduce((sum, brand) => sum + brand.productCount, 0);
  const date = (value: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(new Date(value)) : 'sin fecha registrada';
  return <aside className="mt-4 border-l-4 border-[#c48b28] bg-[#fbf9f5] p-3 text-xs leading-relaxed text-[#5a5d55]" aria-label="Alcance y fechas del archivo">
    <p>Archivo de consultas parciales. Precios, stock y fichas pueden haber cambiado: confirmalos en la tienda.
      No se garantiza una revisión semanal de todos los productos.</p>
    <p className="mt-1">El archivo puede incluir accesorios y otros artículos de las tiendas. Las categorías son las publicadas por cada fuente; el semáforo evalúa únicamente la composición interpretable.</p>
    {reported > loaded && <p className="mt-1 font-bold">Se cargaron {loaded.toLocaleString('es-AR')} de {reported.toLocaleString('es-AR')} productos informados por la fuente. Los filtros y la búsqueda recorren esta selección.</p>}
    <details className="mt-2">
      <summary className="cursor-pointer underline">Fechas de las últimas corridas parciales por marca</summary>
      <p className="mt-1">Estas fechas no demuestran que se haya revisado todo el catálogo de la marca ni cada prenda.</p>
      <ul className="mt-1 space-y-1">{brands.map(brand => <li key={brand.id}>{brand.name}: {date(brand.lastScrapedAt)}</li>)}</ul>
    </details>
  </aside>;
}

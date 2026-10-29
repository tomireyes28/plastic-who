'use client';

import { useMemo, useState } from 'react';
import {
  BrandSummary,
  ProductCardItem,
  TrafficLightColor,
} from '../types/catalog';
import { ContactModal } from './ContactModal';
import { FiberGuideView } from './FiberGuideView';
import { GarmentCard } from './GarmentCard';
import { TrafficLightInfoModal } from './TrafficLightInfoModal';

interface CatalogExplorerProps {
  initialBrands: BrandSummary[];
  initialProducts: ProductCardItem[];
}

type ExploreMode = 'brand' | 'material' | 'guide';
type SortOption =
  | 'natural_desc'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'natural_asc';

const MATERIAL_OPTIONS = [
  { key: 'algodón', label: 'Algodón' },
  { key: 'lino', label: 'Lino' },
  { key: 'bambú', label: 'Bambú' },
  { key: 'ramié', label: 'Ramié' },
  { key: 'lana', label: 'Lana' },
  { key: 'seda', label: 'Seda' },
  { key: 'viscosa', label: 'Viscosa / Lyocell' },
];

export function CatalogExplorer({
  initialBrands,
  initialProducts,
}: CatalogExplorerProps) {
  const [mode, setMode] = useState<ExploreMode>('brand');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('algodón');
  const [selectedLight, setSelectedLight] = useState<TrafficLightColor | 'ALL'>(
    'ALL',
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('natural_desc');
  const [visibleCount, setVisibleCount] = useState<number>(36);

  // Estados de modales
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Categorías únicas presentes en las prendas cargadas
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialProducts) {
      if (p.category) set.add(p.category);
    }
    return ['TODAS', ...Array.from(set).sort()];
  }, [initialProducts]);

  // Filtrado reactivo instantáneo sobre el catálogo cargado
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter((product) => {
        if (mode === 'brand' && selectedBrand !== 'ALL') {
          if (product.brand.slug !== selectedBrand) return false;
        }

        if (mode === 'material') {
          const hasMat = product.fibers.some((f) => {
            if (f.isLining || f.percentage <= 0) return false;
            if (selectedMaterial === 'viscosa') {
              return ['viscosa', 'lyocell', 'modal', 'tencel', 'rayón', 'rayon'].includes(
                f.fiberName.toLowerCase(),
              );
            }
            return f.fiberName.toLowerCase() === selectedMaterial.toLowerCase();
          });
          if (!hasMat) return false;
        }

        if (selectedLight !== 'ALL' && product.trafficLight !== selectedLight) {
          return false;
        }

        if (
          selectedCategory !== 'TODAS' &&
          product.category !== selectedCategory
        ) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = product.name.toLowerCase().includes(q);
          const matchBrand = product.brand.name.toLowerCase().includes(q);
          const matchCat = product.category?.toLowerCase().includes(q);
          const matchComp = (product.rawComposition || '')
            .toLowerCase()
            .includes(q);
          const matchFiber = product.fibers.some((f) =>
            f.fiberName.toLowerCase().includes(q),
          );

          if (!matchName && !matchBrand && !matchCat && !matchComp && !matchFiber) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'price_asc') {
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return a.price - b.price;
        }
        if (sortOption === 'price_desc') {
          if (a.price === null) return 1;
          if (b.price === null) return -1;
          return b.price - a.price;
        }
        if (sortOption === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortOption === 'natural_asc') {
          return a.naturalPercentage - b.naturalPercentage;
        }
        // default: natural_desc
        return b.naturalPercentage - a.naturalPercentage;
      });
  }, [
    initialProducts,
    mode,
    selectedBrand,
    selectedMaterial,
    selectedLight,
    selectedCategory,
    searchQuery,
    sortOption,
  ]);

  // Listado recortado para renderizado fluido en el DOM
  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  // Resumen estadístico de la vista actual
  const stats = useMemo(() => {
    const green = filteredProducts.filter(
      (p) => p.trafficLight === 'GREEN',
    ).length;
    const yellow = filteredProducts.filter(
      (p) => p.trafficLight === 'YELLOW',
    ).length;
    const red = filteredProducts.filter((p) => p.trafficLight === 'RED').length;
    const unknown = filteredProducts.filter(
      (p) => p.trafficLight === 'UNKNOWN',
    ).length;
    return { total: filteredProducts.length, green, yellow, red, unknown };
  }, [filteredProducts]);

  const hasActiveFilters =
    selectedBrand !== 'ALL' ||
    selectedLight !== 'ALL' ||
    selectedCategory !== 'TODAS' ||
    searchQuery.trim().length > 0;

  function clearAllFilters() {
    setSelectedBrand('ALL');
    setSelectedLight('ALL');
    setSelectedCategory('TODAS');
    setSearchQuery('');
    setSortOption('natural_desc');
    setVisibleCount(36);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      {/* Cabecera Editorial */}
      <header className="border-b-2 border-[#191c18] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-label inline-block bg-[#191c18] px-2.5 py-1 text-[11px] font-bold tracking-widest text-[#f3efe6] uppercase">
            PLASTIC WHO? · ARCHIVO Y AUDITORÍA TEXTIL
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              className="font-label cursor-pointer border border-[#cfc6b4] bg-[#f3efe6] px-2.5 py-1 text-[11px] font-bold text-[#191c18] transition-colors hover:border-[#191c18] hover:bg-[#191c18] hover:text-[#f3efe6]"
            >
              ℹ️ Criterio
            </button>
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="font-label cursor-pointer border border-[#2b593f] bg-[#2b593f] px-2.5 py-1 text-[11px] font-bold text-[#f3efe6] transition-colors hover:bg-[#1f442f]"
            >
              ✉️ Sugerir marca
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-editorial text-4xl leading-none font-bold tracking-tight text-[#191c18] sm:text-5xl">
            Plastic Who?
          </h1>
          <span className="font-label text-xs text-[#5a5d55]">
            {initialProducts.length.toLocaleString('es-AR')} prendas auditadas
          </span>
        </div>

        <p className="mt-2.5 max-w-xl text-base leading-relaxed text-[#494c45]">
          Ropa filtrada por lo que realmente está hecha en su etiqueta interna,
          no por lo que promete el marketing de temporada.
        </p>

        {/* Navegación principal tipo pestañas de fichero */}
        <nav
          aria-label="Modo de exploración"
          className="mt-6 grid grid-cols-3 border border-[#191c18] bg-[#e8e2d5] p-1"
        >
          <button
            type="button"
            onClick={() => setMode('brand')}
            className={`font-label cursor-pointer py-2.5 text-xs font-bold tracking-wider uppercase transition-colors ${
              mode === 'brand'
                ? 'bg-[#191c18] text-[#f3efe6]'
                : 'text-[#191c18] hover:bg-[#ded7c7]'
            }`}
          >
            Por Marca
          </button>
          <button
            type="button"
            onClick={() => setMode('material')}
            className={`font-label cursor-pointer py-2.5 text-xs font-bold tracking-wider uppercase transition-colors ${
              mode === 'material'
                ? 'bg-[#191c18] text-[#f3efe6]'
                : 'text-[#191c18] hover:bg-[#ded7c7]'
            }`}
          >
            Por Fibra
          </button>
          <button
            type="button"
            onClick={() => setMode('guide')}
            className={`font-label cursor-pointer py-2.5 text-xs font-bold tracking-wider uppercase transition-colors ${
              mode === 'guide'
                ? 'bg-[#191c18] text-[#f3efe6]'
                : 'text-[#191c18] hover:bg-[#ded7c7]'
            }`}
          >
            Semáforo y Guía
          </button>
        </nav>
      </header>

      {mode === 'guide' ? (
        <div className="mt-8">
          <FiberGuideView />
        </div>
      ) : (
        <>
          {/* Panel de Filtros Táctiles */}
          <section className="garment-tag-border mt-6 bg-[#fbf9f5] p-4 sm:p-5">
            {mode === 'brand' ? (
              <div>
                <div className="font-label text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase">
                  1. Seleccioná una tienda auditada
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand('ALL');
                      setVisibleCount(36);
                    }}
                    className={`font-label cursor-pointer border px-3.5 py-2 text-xs font-bold uppercase transition-all ${
                      selectedBrand === 'ALL'
                        ? 'border-[#191c18] bg-[#191c18] text-[#f3efe6]'
                        : 'border-[#cfc6b4] bg-[#f3efe6] text-[#191c18] hover:border-[#191c18]'
                    }`}
                  >
                    Todas ({initialProducts.length.toLocaleString('es-AR')})
                  </button>
                  {initialBrands.map((b) => {
                    const active = selectedBrand === b.slug;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBrand(b.slug);
                          setVisibleCount(36);
                        }}
                        className={`font-label cursor-pointer border px-3.5 py-2 text-xs font-bold uppercase transition-all ${
                          active
                            ? 'border-[#191c18] bg-[#191c18] text-[#f3efe6]'
                            : 'border-[#cfc6b4] bg-[#f3efe6] text-[#191c18] hover:border-[#191c18]'
                        }`}
                      >
                        {b.name}{' '}
                        <span className="opacity-70">({b.productCount})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-label text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase">
                  1. Elegí el material que buscás en la tela exterior
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {MATERIAL_OPTIONS.map((mat) => {
                    const active = selectedMaterial === mat.key;
                    return (
                      <button
                        key={mat.key}
                        type="button"
                        onClick={() => {
                          setSelectedMaterial(mat.key);
                          setVisibleCount(36);
                        }}
                        className={`font-label cursor-pointer border px-3.5 py-2 text-xs font-bold uppercase transition-all ${
                          active
                            ? 'border-[#2b593f] bg-[#2b593f] text-[#f3efe6]'
                            : 'border-[#cfc6b4] bg-[#f3efe6] text-[#191c18] hover:border-[#2b593f]'
                        }`}
                      >
                        {mat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Barra de Búsqueda Destacada */}
            <div className="mt-4 border-t border-dashed border-[#d5cdbe] pt-4">
              <label
                htmlFor="search-input"
                className="font-label block text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase"
              >
                2. Buscador en tiempo real (prenda, tejido o color)
              </label>
              <div className="relative mt-1.5 flex items-center">
                <span className="absolute left-3 text-sm text-[#8c887e]">
                  🔍
                </span>
                <input
                  id="search-input"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(36);
                  }}
                  placeholder="Ej: lino, pijama bananas, camisa ramié, campera, bambú..."
                  className="font-label w-full border border-[#cfc6b4] bg-[#f3efe6] py-2.5 pr-8 pl-9 text-xs text-[#191c18] placeholder:text-[#8c887e] focus:border-[#191c18] focus:bg-[#fbf9f5] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setVisibleCount(36);
                    }}
                    className="absolute right-2.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#191c18]/10 text-xs text-[#191c18] hover:bg-[#191c18] hover:text-[#f3efe6]"
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filtros secundarios: Semáforo + Categoría + Ordenamiento */}
            <div className="mt-4 grid gap-3 border-t border-dashed border-[#d5cdbe] pt-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-label block text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase">
                    Semáforo Textil
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsInfoOpen(true)}
                    className="font-label text-[10px] text-[#2b593f] underline hover:text-[#191c18]"
                  >
                    ¿Cómo funciona?
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'ALL', label: `Todos (${stats.total})` },
                      { id: 'GREEN', label: '🟢 Verde ≥95%' },
                      { id: 'YELLOW', label: '🟡 Amarillo' },
                      { id: 'RED', label: '🔴 Rojo' },
                      { id: 'UNKNOWN', label: '⚪ No indica' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedLight(opt.id);
                        setVisibleCount(36);
                      }}
                      className={`font-label cursor-pointer border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                        selectedLight === opt.id
                          ? 'border-[#191c18] bg-[#191c18] text-[#f3efe6]'
                          : 'border-[#d5cdbe] bg-[#f3efe6] text-[#191c18] hover:border-[#191c18]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <label
                    htmlFor="category-select"
                    className="font-label block text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase"
                  >
                    Tipo de Prenda
                  </label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setVisibleCount(36);
                    }}
                    className="font-label mt-1.5 w-full border border-[#cfc6b4] bg-[#f3efe6] px-2.5 py-1.5 text-xs text-[#191c18] focus:border-[#191c18] focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label
                    htmlFor="sort-select"
                    className="font-label block text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase"
                  >
                    Ordenar Por
                  </label>
                  <select
                    id="sort-select"
                    value={sortOption}
                    onChange={(e) => {
                      setSortOption(e.target.value as SortOption);
                      setVisibleCount(36);
                    }}
                    className="font-label mt-1.5 w-full border border-[#cfc6b4] bg-[#f3efe6] px-2.5 py-1.5 text-xs text-[#191c18] focus:border-[#191c18] focus:outline-none"
                  >
                    <option value="natural_desc">🌱 Más natural primero</option>
                    <option value="price_asc">💵 Menor precio</option>
                    <option value="price_desc">💎 Mayor precio</option>
                    <option value="name_asc">🔤 Nombre (A-Z)</option>
                    <option value="natural_asc">🧪 Menos natural primero</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Badges de filtros activos con botón limpiar */}
            {hasActiveFilters && (
              <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-dashed border-[#d5cdbe] pt-3">
                <span className="font-label text-[10px] text-[#5a5d55] uppercase font-bold">
                  Filtros activos:
                </span>
                {selectedBrand !== 'ALL' && (
                  <span className="font-label inline-flex items-center gap-1 bg-[#191c18] px-2 py-0.5 text-[10px] font-bold text-[#f3efe6]">
                    Tienda:{' '}
                    {initialBrands.find((b) => b.slug === selectedBrand)?.name}
                    <button
                      type="button"
                      onClick={() => setSelectedBrand('ALL')}
                      className="cursor-pointer font-bold hover:text-[#c48b28]"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedLight !== 'ALL' && (
                  <span className="font-label inline-flex items-center gap-1 bg-[#191c18] px-2 py-0.5 text-[10px] font-bold text-[#f3efe6]">
                    Semáforo: {selectedLight}
                    <button
                      type="button"
                      onClick={() => setSelectedLight('ALL')}
                      className="cursor-pointer font-bold hover:text-[#c48b28]"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedCategory !== 'TODAS' && (
                  <span className="font-label inline-flex items-center gap-1 bg-[#191c18] px-2 py-0.5 text-[10px] font-bold text-[#f3efe6]">
                    Tipo: {selectedCategory}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('TODAS')}
                      className="cursor-pointer font-bold hover:text-[#c48b28]"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="font-label inline-flex items-center gap-1 bg-[#191c18] px-2 py-0.5 text-[10px] font-bold text-[#f3efe6]">
                    &ldquo;{searchQuery}&rdquo;
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="cursor-pointer font-bold hover:text-[#c48b28]"
                    >
                      ✕
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="font-label text-[10px] font-bold text-[#8a281d] underline hover:text-[#191c18]"
                >
                  Limpiar todos
                </button>
              </div>
            )}
          </section>

          {/* Leyenda de la trama */}
          <div className="font-label mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5a5d55]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 bg-[#2b593f]" /> Fibra Natural
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 bg-[#c48b28]" /> Semisintética
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 bg-[#b33c2e]" /> Sintética (Plástico)
              </span>
            </div>
            <span className="text-[11px] opacity-80">
              {sortOption === 'price_asc' && 'Ordenado por menor precio'}
              {sortOption === 'price_desc' && 'Ordenado por mayor precio'}
              {sortOption === 'name_asc' && 'Ordenado por nombre A-Z'}
              {sortOption === 'natural_desc' && 'Ordenado por mayor pureza natural'}
              {sortOption === 'natural_asc' && 'Ordenado por menor pureza natural'}
            </span>
          </div>

          {/* Listado de Fichas */}
          <section className="mt-4 space-y-4">
            {filteredProducts.length > 0 ? (
              <>
                <div className="font-label flex items-center justify-between text-xs text-[#5a5d55]">
                  <span>
                    Mostrando {displayedProducts.length} de{' '}
                    {filteredProducts.length.toLocaleString('es-AR')} prendas
                  </span>
                </div>
                {displayedProducts.map((product) => (
                  <GarmentCard key={product.id} product={product} />
                ))}
                {visibleCount < filteredProducts.length && (
                  <div className="pt-4 pb-8 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 36)}
                      className="font-label cursor-pointer border border-[#191c18] bg-[#191c18] px-6 py-3 text-xs font-bold tracking-wider text-[#f3efe6] uppercase transition-colors hover:bg-[#333]"
                    >
                      Cargar más prendas ({filteredProducts.length - visibleCount}{' '}
                      restantes)
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="garment-tag-border bg-[#fbf9f5] p-8 text-center">
                <p className="font-editorial text-lg font-semibold text-[#191c18]">
                  No encontramos prendas con esa combinación de filtros.
                </p>
                <p className="mt-1 text-sm text-[#5a5d55]">
                  Probá cambiando el filtro del semáforo a &ldquo;Todos&rdquo;,
                  borrando la búsqueda o seleccionando otra tienda.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="font-label mt-4 cursor-pointer bg-[#191c18] px-4 py-2 text-xs font-bold tracking-wider text-[#f3efe6] uppercase"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </section>

          {/* Pie de página editorial */}
          <footer className="mt-12 border-t-2 border-[#191c18] pt-6 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-editorial text-lg font-bold text-[#191c18]">
                  Plastic Who?
                </span>
                <p className="font-label text-xs text-[#5a5d55]">
                  plasticwho.com · Auditoría Textil Independiente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsContactOpen(true)}
                className="font-label cursor-pointer border border-[#191c18] bg-[#f3efe6] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#191c18] transition-colors hover:bg-[#191c18] hover:text-[#f3efe6]"
              >
                ✉️ Contacto: info@plasticwho.com
              </button>
            </div>
          </footer>
        </>
      )}

      {/* Modales */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
      <TrafficLightInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
}

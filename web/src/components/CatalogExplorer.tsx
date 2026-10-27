'use client';

import { useMemo, useState } from 'react';
import {
  BrandSummary,
  ProductCardItem,
  TrafficLightColor,
} from '../types/catalog';
import { FiberGuideView } from './FiberGuideView';
import { GarmentCard } from './GarmentCard';

interface CatalogExplorerProps {
  initialBrands: BrandSummary[];
  initialProducts: ProductCardItem[];
}

type ExploreMode = 'brand' | 'material' | 'guide';

const MATERIAL_OPTIONS = [
  { key: 'algodón', label: 'Algodón' },
  { key: 'lino', label: 'Lino' },
  { key: 'ramié', label: 'Ramié' },
  { key: 'lana', label: 'Lana' },
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
              return ['viscosa', 'lyocell', 'modal'].includes(
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
          const matchComp = (product.rawComposition || '')
            .toLowerCase()
            .includes(q);
          if (!matchName && !matchComp) return false;
        }

        return true;
      })
      .sort((a, b) => b.naturalPercentage - a.naturalPercentage);
  }, [
    initialProducts,
    mode,
    selectedBrand,
    selectedMaterial,
    selectedLight,
    selectedCategory,
    searchQuery,
  ]);

  // Resumen estadístico de la vista actual
  const stats = useMemo(() => {
    const green = filteredProducts.filter(
      (p) => p.trafficLight === 'GREEN',
    ).length;
    const yellow = filteredProducts.filter(
      (p) => p.trafficLight === 'YELLOW',
    ).length;
    const red = filteredProducts.filter((p) => p.trafficLight === 'RED').length;
    return { total: filteredProducts.length, green, yellow, red };
  }, [filteredProducts]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-20 sm:px-6">
      {/* Cabecera Editorial */}
      <header className="border-b-2 border-[#191c18] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-label inline-block bg-[#191c18] px-2.5 py-1 text-[11px] font-bold tracking-widest text-[#f3efe6] uppercase">
            ARCHIVO TEXTIL · EDICIÓN ARGENTINA
          </span>
          <span className="font-label text-xs text-[#5a5d55]">
            {initialProducts.length} fichas auditadas en base de datos
          </span>
        </div>

        <h1 className="font-editorial mt-4 text-4xl leading-none font-bold tracking-tight text-[#191c18] sm:text-5xl">
          Plastic Who?
        </h1>
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
                    onClick={() => setSelectedBrand('ALL')}
                    className={`font-label cursor-pointer border px-3.5 py-2 text-xs font-bold uppercase transition-all ${
                      selectedBrand === 'ALL'
                        ? 'border-[#191c18] bg-[#191c18] text-[#f3efe6]'
                        : 'border-[#cfc6b4] bg-[#f3efe6] text-[#191c18] hover:border-[#191c18]'
                    }`}
                  >
                    Todas ({initialProducts.length})
                  </button>
                  {initialBrands.map((b) => {
                    const active = selectedBrand === b.slug;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBrand(b.slug)}
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
                        onClick={() => setSelectedMaterial(mat.key)}
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

            {/* Filtros secundarios: Semáforo + Categoría + Buscador */}
            <div className="mt-4 grid gap-3 border-t border-dashed border-[#d5cdbe] pt-4 sm:grid-cols-2">
              <div>
                <label className="font-label block text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase">
                  Semáforo de Composición
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'ALL', label: `Todos (${stats.total})` },
                      { id: 'GREEN', label: '🟢 Verde ≥95%' },
                      { id: 'YELLOW', label: '🟡 Amarillo' },
                      { id: 'RED', label: '🔴 Rojo' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedLight(opt.id)}
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
                    onChange={(e) => setSelectedCategory(e.target.value)}
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
                    htmlFor="search-input"
                    className="font-label block text-[11px] font-bold tracking-wider text-[#5a5d55] uppercase"
                  >
                    Buscar prenda o fibra
                  </label>
                  <input
                    id="search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ej: camisa, ramié..."
                    className="font-label mt-1.5 w-full border border-[#cfc6b4] bg-[#f3efe6] px-2.5 py-1.5 text-xs text-[#191c18] placeholder:text-[#8c887e] focus:border-[#191c18] focus:outline-none"
                  />
                </div>
              </div>
            </div>
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
            <span>Ordenado de mayor a menor % natural</span>
          </div>

          {/* Listado de Fichas */}
          <section className="mt-4 space-y-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <GarmentCard key={product.id} product={product} />
              ))
            ) : (
              <div className="garment-tag-border bg-[#fbf9f5] p-8 text-center">
                <p className="font-editorial text-lg font-semibold text-[#191c18]">
                  No encontramos prendas con esa combinación de filtros.
                </p>
                <p className="mt-1 text-sm text-[#5a5d55]">
                  Probá cambiando el filtro del semáforo a &ldquo;Todos&rdquo; o
                  eligiendo otra fibra.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLight('ALL');
                    setSelectedCategory('TODAS');
                    setSearchQuery('');
                  }}
                  className="font-label mt-4 cursor-pointer bg-[#191c18] px-4 py-2 text-xs font-bold tracking-wider text-[#f3efe6] uppercase"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

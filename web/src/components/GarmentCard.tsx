import { formatArsPrice } from '../lib/api';
import { ProductCardItem, TrafficLightColor } from '../types/catalog';
import { WeaveBar } from './WeaveBar';

interface GarmentCardProps {
  product: ProductCardItem;
}

const STAMP_CONFIG: Record<
  TrafficLightColor,
  {
    label: string;
    sublabel: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  GREEN: {
    label: 'VERDE · FIBRA NOBLE',
    sublabel: '≥95% natural',
    badgeClass:
      'border-[#2b593f]/40 bg-[#2b593f]/10 text-[#1f442f]',
    dotClass: 'bg-[#2b593f]',
  },
  YELLOW: {
    label: 'AMARILLO · MEZCLA / CELULÓSICA',
    sublabel: '70–94% nat. o semisintético',
    badgeClass:
      'border-[#c48b28]/50 bg-[#c48b28]/15 text-[#6e4b0c]',
    dotClass: 'bg-[#c48b28]',
  },
  RED: {
    label: 'ROJO · ALTO SINTÉTICO',
    sublabel: '<70% natural',
    badgeClass:
      'border-[#b33c2e]/40 bg-[#b33c2e]/10 text-[#7d2319]',
    dotClass: 'bg-[#b33c2e]',
  },
};

export function GarmentCard({ product }: GarmentCardProps) {
  const stamp = STAMP_CONFIG[product.trafficLight];
  const mainFibers = product.fibers.filter((f) => !f.isLining);
  const liningFibers = product.fibers.filter((f) => f.isLining);

  const formattedPrice = formatArsPrice(product.price);
  const formattedSpecial = formatArsPrice(product.specialPrice);

  return (
    <article className="garment-tag-border group relative flex flex-col justify-between rounded-none bg-[#fbf9f5] transition-transform duration-200 hover:-translate-y-0.5">
      {/* Cabecera tipo etiqueta cosida con pespunte */}
      <div className="flex items-center justify-between border-b border-dashed border-[#cfc6b4] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-label text-[11px] font-bold tracking-widest text-[#191c18] uppercase">
            {product.brand.name}
          </span>
          {product.category && (
            <>
              <span className="text-[#b5ac9a]">/</span>
              <span className="font-label text-[11px] text-[#5a5d55] uppercase">
                {product.category}
              </span>
            </>
          )}
        </div>

        <span
          className={`font-label inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${stamp.badgeClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${stamp.dotClass}`} />
          {stamp.label}
        </span>
      </div>

      {/* Cuerpo de la ficha */}
      <div className="flex gap-4 p-4">
        {product.imageUrl && (
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative h-28 w-22 shrink-0 overflow-hidden border border-[#ded7c8] bg-[#ece7dc]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          </a>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-editorial text-lg leading-snug font-semibold text-[#191c18]">
                {product.name}
              </h3>
              <div className="shrink-0 text-right">
                <span className="font-editorial text-2xl font-bold text-[#191c18]">
                  {product.naturalPercentage}%
                </span>
                <span className="font-label block text-[10px] tracking-wider text-[#5a5d55] uppercase">
                  natural
                </span>
              </div>
            </div>

            {/* Barra de trama textil */}
            <div className="mt-3">
              <WeaveBar fibers={product.fibers} />
            </div>

            {/* Desglose exacto de fibras */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {mainFibers.map((f, i) => (
                <span
                  key={`${f.fiberName}-${i}`}
                  className="font-label inline-block bg-[#efeadf] px-2 py-0.5 text-xs font-bold text-[#191c18]"
                >
                  {f.percentage}% {f.fiberName}
                </span>
              ))}
            </div>

            {product.hasSyntheticLining && (
              <p className="font-label mt-2 border-l-2 border-[#b33c2e] pl-2 text-[11px] text-[#7d2319]">
                Forrería sintética:{' '}
                {liningFibers
                  .map((f) => `${f.percentage}% ${f.fiberName}`)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pie de etiqueta: precio + link directo */}
      <div className="flex items-center justify-between border-t border-[#e5decfe0] bg-[#f6f2e9] px-4 py-2.5">
        <div className="font-label text-xs">
          {formattedSpecial ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#191c18]">{formattedSpecial}</span>
              {formattedPrice && (
                <span className="text-[#7c7a72] line-through">
                  {formattedPrice}
                </span>
              )}
            </div>
          ) : formattedPrice ? (
            <span className="font-bold text-[#191c18]">{formattedPrice}</span>
          ) : (
            <span className="text-[#7c7a72]">Ficha verificada</span>
          )}
        </div>

        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-label inline-flex items-center gap-1 text-xs font-bold tracking-wider text-[#191c18] uppercase underline decoration-[#2b593f] decoration-2 underline-offset-4 transition-colors hover:text-[#2b593f]"
        >
          Ver en la tienda ↗
        </a>
      </div>
    </article>
  );
}

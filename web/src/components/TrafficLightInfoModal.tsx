'use client';

import { useId } from 'react';
import { ModalShell } from './ModalShell';

interface TrafficLightInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrafficLightInfoModal({
  isOpen,
  onClose,
}: TrafficLightInfoModalProps) {
  const titleId = useId();
  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} titleId={titleId}>
      <div
        className="garment-tag-border relative max-h-[calc(100dvh-2rem)] min-w-0 overflow-y-auto overscroll-contain [overflow-wrap:anywhere] w-full max-w-xl border-2 border-[#191c18] bg-[#fbf9f5] p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          className="font-label absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center border border-[#cfc6b4] bg-[#f3efe6] text-sm font-bold text-[#191c18] transition-colors hover:border-[#191c18] hover:bg-[#191c18] hover:text-[#f3efe6]"
        >
          ✕
        </button>

        <span className="font-label text-[11px] font-bold tracking-widest text-[#2b593f] uppercase">
          Plastic Who? · Criterio de Auditoría
        </span>

        <h2 id={titleId} className="font-editorial mt-1 pr-8 text-2xl font-bold text-[#191c18] sm:text-3xl">
          ¿Cómo puntuamos las prendas?
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#5a5d55]">
          Clasificamos la composición declarada por la tienda con un criterio
          propio sobre fibras. El color no es una certificación de salud,
          comodidad o impacto ambiental de la prenda.
        </p>

        <div className="mt-5 space-y-3">
          <div className="border-l-4 border-[#2b593f] bg-[#f3efe6] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-label text-xs font-bold text-[#2b593f] uppercase">
                🟢 Verde · Fibras Naturales Nobles (≥95%)
              </span>
              <span className="font-label text-[10px] bg-[#2b593f]/15 px-2 py-0.5 text-[#2b593f] font-bold">
                RECOMENDADO
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              Tela exterior con al menos 95% de fibras naturales y hasta un 5%
              de otras fibras, incluido elastano. Si se declara cualquier fibra
              sintética en el forro, baja de verde a amarillo.
            </p>
          </div>

          <div className="border-l-4 border-[#c48b28] bg-[#f3efe6] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-label text-xs font-bold text-[#8c6014] uppercase">
                🟡 Amarillo · Mezclas, Celulósicas o Forro
              </span>
              <span className="font-label text-[10px] bg-[#c48b28]/15 px-2 py-0.5 text-[#8c6014] font-bold">
                INTERMEDIO
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              Cuando no cumple el criterio verde: exterior con al menos 70%
              natural, o presencia de semisintéticas como viscosa, modal o
              lyocell. También un exterior
              que sería verde pero tiene forro sintético. El forro se informa
              por separado: no se suma a los porcentajes del exterior.
            </p>
          </div>

          <div className="border-l-4 border-[#b33c2e] bg-[#f3efe6] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-label text-xs font-bold text-[#8a281d] uppercase">
                🔴 Rojo · Alto Plástico (&lt;70% Natural)
              </span>
              <span className="font-label text-[10px] bg-[#b33c2e]/15 px-2 py-0.5 text-[#8a281d] font-bold">
                EVITAR
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              Exterior con menos de 70% natural y sin fibras semisintéticas
              detectadas. Un forro sintético no convierte una prenda roja en
              amarilla.
            </p>
          </div>

          <div className="border-l-4 border-[#8c887e] bg-[#f3efe6] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-label text-xs font-bold text-[#5a5d55] uppercase">
                ⚪ Gris · Sin Clasificar
              </span>
              <span className="font-label text-[10px] bg-[#8c887e]/20 px-2 py-0.5 text-[#5a5d55] font-bold">
                SIN CLASIFICAR
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              No hay información suficiente para clasificar: puede faltar la
              declaración, estar incompleta o tener un formato que no pudimos
              interpretar. Esto no implica necesariamente una omisión de la marca.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-dashed border-[#cfc6b4] pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="font-label cursor-pointer border border-[#191c18] bg-[#191c18] px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#f3efe6] transition-colors hover:bg-[#343831]"
          >
            Entendido
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

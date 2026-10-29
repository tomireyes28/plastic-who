'use client';

interface TrafficLightInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrafficLightInfoModal({
  isOpen,
  onClose,
}: TrafficLightInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#191c18]/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="garment-tag-border relative w-full max-w-xl border-2 border-[#191c18] bg-[#fbf9f5] p-6 shadow-2xl sm:p-8"
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

        <h2 className="font-editorial mt-1 text-2xl font-bold text-[#191c18] sm:text-3xl">
          ¿Cómo puntuamos las prendas?
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#5a5d55]">
          Auditamos la composición técnica de cada prenda según la etiqueta
          obligatoria declarada en el código fuente de cada tienda, sin dejarnos
          llevar por etiquetas de marketing como &ldquo;eco-friendly&rdquo; o
          &ldquo;tacto sedoso&rdquo;.
        </p>

        <div className="mt-5 space-y-3">
          <div className="border-l-4 border-[#2b593f] bg-[#f3efe6] p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-label text-xs font-bold text-[#2b593f] uppercase">
                🟢 Verde · Fibras Naturales Nobles (≥95%)
              </span>
              <span className="font-label text-[10px] bg-[#2b593f]/15 px-2 py-0.5 text-[#2b593f] font-bold">
                RECOMENDADO
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              Prendas puras de algodón (pima, peinado, orgánico), lino, lana
              merino, seda, cáñamo o bambú. Se tolera hasta un 5% de elastano
              exclusivamente para ajuste y durabilidad. Pierde el verde si el
              forro interno es de poliéster.
            </p>
          </div>

          <div className="border-l-4 border-[#c48b28] bg-[#f3efe6] p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-label text-xs font-bold text-[#8c6014] uppercase">
                🟡 Amarillo · Semisintéticas y Mezclas (70–94%)
              </span>
              <span className="font-label text-[10px] bg-[#c48b28]/15 px-2 py-0.5 text-[#8c6014] font-bold">
                INTERMEDIO
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              Telas de pulpa vegetal regenerada como viscosa, modal, rayón o
              lyocell/tencel; o mezclas naturales con presencia moderada de
              sintéticos. También prendas exteriores naturales que tienen forrería
              de poliéster.
            </p>
          </div>

          <div className="border-l-4 border-[#b33c2e] bg-[#f3efe6] p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-label text-xs font-bold text-[#8a281d] uppercase">
                🔴 Rojo · Alto Plástico (&lt;70% Natural)
              </span>
              <span className="font-label text-[10px] bg-[#b33c2e]/15 px-2 py-0.5 text-[#8a281d] font-bold">
                EVITAR
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              Prendas dominadas por fibras plásticas derivadas del petróleo:
              poliéster, microtul, poliamida/nylon, acrílico o poliuretano. No
              respiran térmicamente y desprenden miles de microplásticos por
              lavado.
            </p>
          </div>

          <div className="border-l-4 border-[#8c887e] bg-[#f3efe6] p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-label text-xs font-bold text-[#5a5d55] uppercase">
                ⚪ Gris · No Informa Composición
              </span>
              <span className="font-label text-[10px] bg-[#8c887e]/20 px-2 py-0.5 text-[#5a5d55] font-bold">
                SIN DATOS
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#191c18]">
              La marca omitió declarar la composición textil en la ficha técnica
              de su tienda online, impidiendo al consumidor saber qué está
              comprando antes de pagar.
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
    </div>
  );
}

import { BIBLIOGRAPHY_ITEMS } from '../data/bibliography';

export function FiberGuideView() {
  return (
    <section className="space-y-8">
      {/* Bloque del Semáforo */}
      <div className="garment-tag-border bg-[#fbf9f5] p-6">
        <span className="font-label text-[11px] font-bold tracking-widest text-[#2b593f] uppercase">
          Criterio de Auditoría
        </span>
        <h2 className="font-editorial mt-1 text-2xl font-bold text-[#191c18]">
          ¿Cómo clasifica el semáforo cada prenda?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5a5d55]">
          No miramos nombres comerciales como &ldquo;eco-friendly&rdquo; ni
          &ldquo;tacto sedoso&rdquo;. Nuestro extractor lee directamente la línea
          técnica de composición declarada por la marca y evalúa la proporción
          de fibras nobles sobre el total de la tela exterior.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="border-l-4 border-[#2b593f] bg-[#f3efe6] p-4">
            <div className="font-label text-xs font-bold text-[#2b593f] uppercase">
              Verde · ≥ 95% Natural
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#191c18]">
              Prendas puras (100% algodón, lino, ramié, lana, seda) o jeans y
              prendas de punto con hasta un 5% de elastano para dar calce.
            </p>
          </div>

          <div className="border-l-4 border-[#c48b28] bg-[#f3efe6] p-4">
            <div className="font-label text-xs font-bold text-[#8c6014] uppercase">
              Amarillo · 70–94% o Celulósicas
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#191c18]">
              Mezclas con mayoría natural (ej. 70% lana / 30% acrílico) o telas
              de pulpa vegetal regenerada como viscosa, modal y lyocell/tencel.
            </p>
          </div>

          <div className="border-l-4 border-[#b33c2e] bg-[#f3efe6] p-4">
            <div className="font-label text-xs font-bold text-[#8a281d] uppercase">
              Rojo · &lt; 70% Natural
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#191c18]">
              Prendas dominadas por plásticos derivados del petróleo (poliéster,
              poliamida/nylon, acrílico, poliuretano/ecocuero).
            </p>
          </div>
        </div>
      </div>

      {/* Diccionario de Materiales */}
      <div className="garment-tag-border bg-[#fbf9f5] p-6">
        <span className="font-label text-[11px] font-bold tracking-widest text-[#5a5d55] uppercase">
          Herbario y Glosario Textil
        </span>
        <h2 className="font-editorial mt-1 text-2xl font-bold text-[#191c18]">
          Las 3 familias de fibras en tu etiqueta
        </h2>

        <div className="mt-5 space-y-5">
          <div className="border-b border-dashed border-[#d5cdbe] pb-4">
            <h3 className="font-editorial text-lg font-bold text-[#2b593f]">
              1. Fibras Naturales (Sin plástico)
            </h3>
            <p className="mt-1 text-sm text-[#5a5d55]">
              Provienen directamente de plantas o animales sin transformación
              plástica. Respiran, regulan la temperatura y no liberan
              microplásticos al lavarlas.
            </p>
            <div className="font-label mt-2.5 flex flex-wrap gap-2 text-xs">
              {[
                'Algodón / Pima',
                'Lino',
                'Ramié',
                'Lana / Merino',
                'Seda',
                'Cáñamo',
              ].map((item) => (
                <span
                  key={item}
                  className="border border-[#2b593f]/30 bg-[#2b593f]/10 px-2.5 py-1 text-[#1f442f]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="border-b border-dashed border-[#d5cdbe] pb-4">
            <h3 className="font-editorial text-lg font-bold text-[#8c6014]">
              2. Fibras Semisintéticas (Celulósicas regeneradas)
            </h3>
            <p className="mt-1 text-sm text-[#5a5d55]">
              Tienen origen vegetal (pulpa de madera, eucalipto o bambú), pero
              atraviesan un proceso químico industrial para convertirse en hilo.
              No son petróleo, pero requieren atención según su proceso.
            </p>
            <div className="font-label mt-2.5 flex flex-wrap gap-2 text-xs">
              {['Viscosa / Rayón', 'Lyocell / Tencel', 'Modal', 'Acetato'].map(
                (item) => (
                  <span
                    key={item}
                    className="border border-[#c48b28]/40 bg-[#c48b28]/15 px-2.5 py-1 text-[#6e4b0c]"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div>
            <h3 className="font-editorial text-lg font-bold text-[#8a281d]">
              3. Fibras Sintéticas (Polímeros plásticos)
            </h3>
            <p className="mt-1 text-sm text-[#5a5d55]">
              Son literalmente polímeros derivados del petróleo hilados en forma
              de tela. Retienen calor y olores, y desprenden microfibras
              plásticas en cada lavado.
            </p>
            <div className="font-label mt-2.5 flex flex-wrap gap-2 text-xs">
              {[
                'Poliéster',
                'Poliamida / Nylon',
                'Acrílico',
                'Elastano / Spandex / Lycra',
                'Poliuretano (Ecocuero)',
              ].map((item) => (
                <span
                  key={item}
                  className="border border-[#b33c2e]/30 bg-[#b33c2e]/10 px-2.5 py-1 text-[#7d2319]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bibliografía y Fuentes Curadas */}
      <div className="garment-tag-border bg-[#fbf9f5] p-6">
        <span className="font-label text-[11px] font-bold tracking-widest text-[#2b593f] uppercase">
          Bibliografía y Evidencia
        </span>
        <h2 className="font-editorial mt-1 text-2xl font-bold text-[#191c18]">
          Estudios, documentales y lecturas recomendadas
        </h2>
        <p className="mt-1 text-sm text-[#5a5d55]">
          Fuentes recopiladas sobre el impacto de los polímeros sintéticos en la
          salud, la piel y el ambiente.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {BIBLIOGRAPHY_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between border border-[#d5cdbe] bg-[#f3efe6] p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label bg-[#191c18] px-2 py-0.5 text-[10px] font-bold text-[#f3efe6] uppercase">
                    {item.type}
                  </span>
                  {item.year && (
                    <span className="font-label text-xs text-[#5a5d55]">
                      {item.year}
                    </span>
                  )}
                </div>
                <h3 className="font-editorial mt-2 text-base font-bold text-[#191c18]">
                  {item.title}
                </h3>
                <p className="font-label mt-0.5 text-[11px] text-[#5a5d55]">
                  {item.authorOrSource}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#3a3d37]">
                  {item.summary}
                </p>
              </div>

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-label mt-3 inline-block text-xs font-bold text-[#2b593f] underline underline-offset-4"
                >
                  Consultar fuente ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

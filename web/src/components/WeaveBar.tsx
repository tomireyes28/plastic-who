import { ParsedFiberItem } from '../types/catalog';

interface WeaveBarProps {
  fibers: ParsedFiberItem[];
}

const CATEGORY_STYLES = {
  NATURAL: {
    bg: 'bg-[#2b593f]',
    label: 'Natural',
  },
  SEMISYNTHETIC: {
    bg: 'bg-[#c48b28]',
    label: 'Semisintética',
  },
  SYNTHETIC: {
    bg: 'bg-[#b33c2e]',
    label: 'Sintética (Plástico)',
  },
} as const;

export function WeaveBar({ fibers }: WeaveBarProps) {
  const mainFibers = fibers.filter((f) => !f.isLining);

  if (mainFibers.length === 0) {
    return (
      <div className="h-3.5 w-full rounded-sm bg-[#e4decfe0] p-0.5">
        <div className="h-full w-full rounded-[2px] bg-[#c5beb0]" />
      </div>
    );
  }

  return (
    <div
      className="flex h-4 w-full gap-1 rounded-sm border border-[#191c18]/15 bg-[#ece6d8] p-0.5"
      role="img"
      aria-label={mainFibers
        .map(
          (f) =>
            `${Math.min(100, Math.max(0, Math.round(f.percentage)))}% ${f.fiberName}`,
        )
        .join(', ')}
    >
      {mainFibers.map((fiber, idx) => {
        const style = CATEGORY_STYLES[fiber.category];
        const clampedPct = Math.min(
          100,
          Math.max(0, Math.round(fiber.percentage)),
        );
        return (
          <div
            key={`${fiber.fiberName}-${idx}`}
            style={{ flexGrow: clampedPct, flexBasis: 0 }}
            title={`${clampedPct}% ${fiber.fiberName} (${style.label})`}
            className={`${style.bg} weave-pattern h-full min-w-[6px] rounded-[2px] transition-all duration-300`}
          />
        );
      })}
    </div>
  );
}

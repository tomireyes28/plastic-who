export type FiberCategory = 'NATURAL' | 'SEMISYNTHETIC' | 'SYNTHETIC';

export type TrafficLightColor = 'GREEN' | 'YELLOW' | 'RED';

export interface ParsedFiberItem {
  /** Nombre canónico en español (ej: "algodón", "ramié", "poliéster") */
  fiberName: string;
  /** Categoría según el origen de la fibra */
  category: FiberCategory;
  /** Porcentaje numérico de 0 a 100 */
  percentage: number;
  /** Indica si pertenece a la forrería / interior y no a la tela exterior principal */
  isLining: boolean;
}

export interface TrafficLightRulesConfig {
  /** Porcentaje mínimo de fibras naturales para ser VERDE (por defecto 95%) */
  greenMinNaturalPct: number;
  /** Porcentaje mínimo de fibras naturales para ser AMARILLO (por defecto 70%) */
  yellowMinNaturalPct: number;
  /** Si tiene fibras semisintéticas (viscosa, lyocell, modal) y no llega a verde, califica como AMARILLO */
  yellowIfHasSemiSynthetic: boolean;
}

export const DEFAULT_TRAFFIC_LIGHT_RULES: TrafficLightRulesConfig = {
  greenMinNaturalPct: 95,
  yellowMinNaturalPct: 70,
  yellowIfHasSemiSynthetic: true,
};

export interface CompositionAnalysisResult {
  /** Texto original de composición extraído de la ficha del producto */
  rawComposition: string | null;
  /** Lista de fibras detectadas (tela principal + forrería si existe) */
  fibers: ParsedFiberItem[];
  /** Suma de porcentajes naturales en la tela principal */
  naturalPercentage: number;
  /** Suma de porcentajes semisintéticos en la tela principal */
  semiSyntheticPercentage: number;
  /** Suma de porcentajes sintéticos en la tela principal */
  syntheticPercentage: number;
  /** Resultado del semáforo para la prenda */
  trafficLight: TrafficLightColor;
  /** True si la prenda declara un forro o interior con fibras sintéticas */
  hasSyntheticLining: boolean;
}

import { Injectable } from '@nestjs/common';
import { FiberCategory } from './fiber-dictionary';

export type TrafficLightColor = 'GREEN' | 'YELLOW' | 'RED';

export interface ParsedFiberItem {
  fiberName: string;
  category: FiberCategory;
  percentage: number;
  isLining: boolean;
}

export interface TrafficLightRulesConfig {
  greenMinNaturalPct: number;
  yellowMinNaturalPct: number;
  yellowIfHasSemiSynthetic: boolean;
}

export const DEFAULT_TRAFFIC_LIGHT_RULES: TrafficLightRulesConfig = {
  greenMinNaturalPct: 95,
  yellowMinNaturalPct: 70,
  yellowIfHasSemiSynthetic: true,
};

export interface TrafficLightEvaluation {
  naturalPercentage: number;
  semiSyntheticPercentage: number;
  syntheticPercentage: number;
  trafficLight: TrafficLightColor;
  hasSyntheticLining: boolean;
}

@Injectable()
export class TrafficLightService {
  evaluate(
    fibers: ParsedFiberItem[],
    rules: TrafficLightRulesConfig = DEFAULT_TRAFFIC_LIGHT_RULES,
  ): TrafficLightEvaluation {
    const mainFibers = fibers.filter((f) => !f.isLining);
    const liningFibers = fibers.filter((f) => f.isLining);

    let naturalPercentage = 0;
    let semiSyntheticPercentage = 0;
    let syntheticPercentage = 0;

    for (const item of mainFibers) {
      if (item.category === 'NATURAL') {
        naturalPercentage += item.percentage;
      } else if (item.category === 'SEMISYNTHETIC') {
        semiSyntheticPercentage += item.percentage;
      } else if (item.category === 'SYNTHETIC') {
        syntheticPercentage += item.percentage;
      }
    }

    // Redondear a 1 decimal por si vienen porcentajes con coma (ej: 98.5%)
    naturalPercentage = Math.round(naturalPercentage * 10) / 10;
    semiSyntheticPercentage = Math.round(semiSyntheticPercentage * 10) / 10;
    syntheticPercentage = Math.round(syntheticPercentage * 10) / 10;

    const hasSyntheticLining = liningFibers.some(
      (f) => f.category === 'SYNTHETIC' && f.percentage > 0,
    );

    let trafficLight: TrafficLightColor = 'RED';

    if (naturalPercentage >= rules.greenMinNaturalPct) {
      trafficLight = 'GREEN';
    } else if (
      naturalPercentage >= rules.yellowMinNaturalPct ||
      (rules.yellowIfHasSemiSynthetic && semiSyntheticPercentage > 0)
    ) {
      trafficLight = 'YELLOW';
    } else {
      trafficLight = 'RED';
    }

    return {
      naturalPercentage,
      semiSyntheticPercentage,
      syntheticPercentage,
      trafficLight,
      hasSyntheticLining,
    };
  }
}

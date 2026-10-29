import { Injectable } from '@nestjs/common';
import { FiberCategory } from './fiber-dictionary';

export type TrafficLightColor = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

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

    if (mainFibers.length === 0) {
      return {
        naturalPercentage: 0,
        semiSyntheticPercentage: 0,
        syntheticPercentage: 0,
        trafficLight: 'UNKNOWN',
        hasSyntheticLining: false,
      };
    }

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

    // Redondear a 1 decimal y limitar rigurosamente a [0, 100]
    naturalPercentage = Math.min(100, Math.max(0, Math.round(naturalPercentage * 10) / 10));
    semiSyntheticPercentage = Math.min(100, Math.max(0, Math.round(semiSyntheticPercentage * 10) / 10));
    syntheticPercentage = Math.min(100, Math.max(0, Math.round(syntheticPercentage * 10) / 10));

    const totalCategoryPct = naturalPercentage + semiSyntheticPercentage + syntheticPercentage;
    if (totalCategoryPct > 100) {
      naturalPercentage = Math.min(100, Math.round((naturalPercentage / totalCategoryPct) * 1000) / 10);
      semiSyntheticPercentage = Math.min(100, Math.round((semiSyntheticPercentage / totalCategoryPct) * 1000) / 10);
      syntheticPercentage = Math.min(100, Math.round((syntheticPercentage / totalCategoryPct) * 1000) / 10);
    }

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

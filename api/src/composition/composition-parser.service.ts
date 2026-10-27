import { Injectable } from '@nestjs/common';
import { resolveFiber } from './fiber-dictionary';
import {
  DEFAULT_TRAFFIC_LIGHT_RULES,
  ParsedFiberItem,
  TrafficLightColor,
  TrafficLightRulesConfig,
  TrafficLightService,
} from './traffic-light.service';

export interface CompositionAnalysisResult {
  rawComposition: string | null;
  fibers: ParsedFiberItem[];
  naturalPercentage: number;
  semiSyntheticPercentage: number;
  syntheticPercentage: number;
  trafficLight: TrafficLightColor;
  hasSyntheticLining: boolean;
}

@Injectable()
export class CompositionParserService {
  constructor(private readonly trafficLightService: TrafficLightService) {}

  /**
   * Analiza el texto de descripción o ficha de un producto y devuelve las fibras y el semáforo.
   */
  parseFromText(
    text: string,
    rules: TrafficLightRulesConfig = DEFAULT_TRAFFIC_LIGHT_RULES,
  ): CompositionAnalysisResult {
    const rawComposition = this.extractCompositionSegment(text);

    if (!rawComposition) {
      return {
        rawComposition: null,
        fibers: [],
        naturalPercentage: 0,
        semiSyntheticPercentage: 0,
        syntheticPercentage: 0,
        trafficLight: 'RED',
        hasSyntheticLining: false,
      };
    }

    const fibers = this.extractFibersFromSegment(rawComposition);
    const evaluation = this.trafficLightService.evaluate(fibers, rules);

    return {
      rawComposition,
      fibers,
      ...evaluation,
    };
  }

  /**
   * Extrae la oración o bloque donde se detalla la composición dentro de una descripción larga o HTML.
   */
  extractCompositionSegment(rawText: string): string | null {
    if (!rawText) return null;

    // Limpiar tags HTML comunes y saltos de línea escapados (\n, <br>)
    const cleaned = rawText
      .replace(/\\r\\n|\\n/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/li>|<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .trim();

    // 1. Buscar etiqueta explícita "Composición:" (puede tener salto de línea inmediato y líneas de "Forrería:")
    const explicitMatch = cleaned.match(
      /composici[oó]n\s*:?\s*([^\n]+(?:\n\s*(?:forr(?:er[ií]a|o)|interior|exterior|g[eé]nero\s*base|tela\s*base|base|tejido\s*\d)\s*:?\s*[^\n]+)*)/i,
    );

    if (explicitMatch && explicitMatch[1]) {
      return explicitMatch[1].replace(/\s+/g, ' ').trim();
    }

    // 2. Buscar líneas que empiecen con "Exterior:" / "Género base:" seguido de porcentajes
    const multiPartMatch = cleaned.match(
      /((?:exterior|tejido\s*principal|g[eé]nero\s*base|tela\s*base|cuerpo)\s*:\s*[^\n]+(?:\n\s*(?:forr(?:er[ií]a|o)|interior)\s*:\s*[^\n]+)*)/i,
    );

    if (multiPartMatch && multiPartMatch[1]) {
      const candidate = multiPartMatch[1].replace(/\s+/g, ' ').trim();
      if (this.extractFibersFromSegment(candidate).length > 0) {
        return candidate;
      }
    }

    // 3. Fallback: buscar en cada línea si contiene patrones "XX% <fibra>" o "<fibra> XX%"
    const lines = cleaned.split('\n');
    for (const line of lines) {
      if (
        /\b\d{1,3}(?:[.,]\d+)?\s*%\s*[a-záéíóúñ]+/i.test(line) ||
        /[a-záéíóúñ]+\s+\d{1,3}(?:[.,]\d+)?\s*%/i.test(line)
      ) {
        const candidate = line.replace(/^[•\-*]\s*/, '').trim();
        if (this.extractFibersFromSegment(candidate).length > 0) {
          return candidate;
        }
      }
    }

    return null;
  }

  /**
   * Parsea un segmento de composición (ej: "98% Algodón - 2% Elastano. Forrería: 100% Poliéster"
   * o formato VTEX "LINO 40%, VISCOSA 60%") separando tela principal de forrería.
   */
  extractFibersFromSegment(segment: string): ParsedFiberItem[] {
    if (!segment) return [];

    const results: ParsedFiberItem[] = [];

    // Dividir en sub-bloques si existen etiquetas como "Exterior:", "Género base:", "Forrería:", "Forro:", "Interior:"
    const sectionRegex =
      /(?:^|[.;|/]\s*|\s+)(exterior|tejido\s*principal|g[eé]nero\s*base|tela\s*base|base|cuerpo|forrer[ií]a|forro|interior)\s*:\s*/gi;

    const sections: Array<{ isLining: boolean; text: string }> = [];
    let lastIndex = 0;
    let currentIsLining = false;
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(segment)) !== null) {
      const precedingText = segment.slice(lastIndex, match.index).trim();
      if (precedingText) {
        sections.push({ isLining: currentIsLining, text: precedingText });
      }
      const label = match[1].toLowerCase();
      currentIsLining =
        label.startsWith('forr') || label.startsWith('interior');
      lastIndex = sectionRegex.lastIndex;
    }

    const remainingText = segment.slice(lastIndex).trim();
    if (remainingText) {
      sections.push({ isLining: currentIsLining, text: remainingText });
    }

    for (const sec of sections) {
      // Soportar tanto "98% Algodón" como formato VTEX "ALGODÓN PIMA 100%" / "LINO 40%, VISCOSA 60%"
      const pctFirstRegex =
        /(\d{1,3}(?:[.,]\d+)?)\s*%\s*([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2})/gi;
      const nameFirstRegex =
        /([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2})\s+(\d{1,3}(?:[.,]\d+)?)\s*%/gi;

      let foundInSection = false;
      let m: RegExpExecArray | null;

      while ((m = pctFirstRegex.exec(sec.text)) !== null) {
        const pct = parseFloat(m[1].replace(',', '.'));
        const rawFiber = m[2];
        const resolved = resolveFiber(rawFiber);
        if (resolved && pct > 0 && pct <= 100) {
          this.addOrMergeFiber(results, {
            fiberName: resolved.canonicalName,
            category: resolved.category,
            percentage: pct,
            isLining: sec.isLining,
          });
          foundInSection = true;
        }
      }

      if (!foundInSection) {
        while ((m = nameFirstRegex.exec(sec.text)) !== null) {
          const rawFiber = m[1];
          const pct = parseFloat(m[2].replace(',', '.'));
          const resolved = resolveFiber(rawFiber);
          if (resolved && pct > 0 && pct <= 100) {
            this.addOrMergeFiber(results, {
              fiberName: resolved.canonicalName,
              category: resolved.category,
              percentage: pct,
              isLining: sec.isLining,
            });
          }
        }
      }
    }

    return results;
  }

  private addOrMergeFiber(
    list: ParsedFiberItem[],
    item: ParsedFiberItem,
  ): void {
    const existing = list.find(
      (f) => f.fiberName === item.fiberName && f.isLining === item.isLining,
    );
    if (existing) {
      existing.percentage =
        Math.round((existing.percentage + item.percentage) * 10) / 10;
    } else {
      list.push(item);
    }
  }
}

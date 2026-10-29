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

const LINING_SECTION_REGEX =
  /^(?:forrer[ií]a(?:\s*\([^)]*\))?|forro(?:-lining)?|interior|viso|lining)$/i;

const SECONDARY_SECTION_REGEX =
  /^(?:ribb?|cuello|pu[ñn]os|complemento|flecos|hilos|vivos|detalles|recortes|(?:g[eé]nero\s*|tela\s*)?combinaci[oó]n|contraste|con\s*aplicaci[oó]n|aplicaci[oó]n|relleno(?:-padding)?(?:\s+hombreras)?|padding|hombreras)$/i;

const MAIN_SECTION_REGEX =
  /^(?:exterior|tejido\s*principal|tela\s*princip?al|g[eé]nero\s*base|tela\s*base|base|cuerpo|composici[oó]n)$/i;

const SECTION_HEADER_REGEX =
  /(?:^|[-.;|/•*\n]\s*|\s+)(exterior|tejido\s*principal|tela\s*princip?al|g[eé]nero\s*base|tela\s*base|base|cuerpo|composici[oó]n|forrer[ií]a(?:\s*\([^)]*\))?|forro(?:-lining)?|interior|viso|lining|ribb?|cuello|pu[ñn]os|complemento|flecos|hilos|vivos|detalles|recortes|(?:g[eé]nero\s*|tela\s*)?combinaci[oó]n|contraste|con\s*aplicaci[oó]n|aplicaci[oó]n|relleno(?:-padding)?(?:\s+hombreras)?|padding|hombreras)(?:\s*[:\-]\s*|\s+(?=\d{1,3}\s*%|[a-záéíóúñA-ZÁÉÍÓÚÑ]+\s+\d{1,3}\s*%))/gi;

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
        rawComposition: 'No indica',
        fibers: [],
        naturalPercentage: 0,
        semiSyntheticPercentage: 0,
        syntheticPercentage: 0,
        trafficLight: 'UNKNOWN',
        hasSyntheticLining: false,
      };
    }

    const fibers = this.extractFibersFromSegment(rawComposition);
    if (fibers.length === 0) {
      return {
        rawComposition: rawComposition || 'No indica',
        fibers: [],
        naturalPercentage: 0,
        semiSyntheticPercentage: 0,
        syntheticPercentage: 0,
        trafficLight: 'UNKNOWN',
        hasSyntheticLining: false,
      };
    }

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
   * Parsea un segmento de composición (ej: "98% Algodón - 2% Elastano. Forrería: 100% Poliéster",
   * "100% ALGODÓN - RIBB: 100% ALGODÓN" o formato VTEX "LINO 40%, VISCOSA 60%") separando tela principal,
   * forrería y partes secundarias (rib, cuello, puños, combinaciones), garantizando que nunca se supere el 100%.
   */
  extractFibersFromSegment(segment: string): ParsedFiberItem[] {
    if (!segment) return [];

    const rawSections: Array<{
      type: 'MAIN' | 'LINING' | 'SECONDARY';
      text: string;
    }> = [];
    let lastIndex = 0;
    let currentType: 'MAIN' | 'LINING' | 'SECONDARY' = 'MAIN';
    let match: RegExpExecArray | null;

    SECTION_HEADER_REGEX.lastIndex = 0;
    while ((match = SECTION_HEADER_REGEX.exec(segment)) !== null) {
      const precedingText = segment.slice(lastIndex, match.index).trim();
      if (precedingText) {
        rawSections.push({ type: currentType, text: precedingText });
      }
      const label = match[1].toLowerCase().trim();
      if (LINING_SECTION_REGEX.test(label)) {
        currentType = 'LINING';
      } else if (SECONDARY_SECTION_REGEX.test(label)) {
        currentType = 'SECONDARY';
      } else if (MAIN_SECTION_REGEX.test(label)) {
        currentType = 'MAIN';
      }
      lastIndex = SECTION_HEADER_REGEX.lastIndex;
    }

    const remainingText = segment.slice(lastIndex).trim();
    if (remainingText) {
      rawSections.push({ type: currentType, text: remainingText });
    }

    const mainFibers: ParsedFiberItem[] = [];
    const liningFibers: ParsedFiberItem[] = [];
    const secondaryFibers: ParsedFiberItem[] = [];

    const parseSectionText = (
      text: string,
      isLining: boolean,
      targetList: ParsedFiberItem[],
    ) => {
      const pctFirstRegex =
        /(\d{1,3}(?:[.,]\d+)?)\s*%\s*([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2})/gi;
      const nameFirstRegex =
        /([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+){0,2})\s+(\d{1,3}(?:[.,]\d+)?)\s*%/gi;

      let found = false;
      let m: RegExpExecArray | null;

      while ((m = pctFirstRegex.exec(text)) !== null) {
        const pct = parseFloat(m[1].replace(',', '.'));
        const rawFiber = m[2];
        const resolved = resolveFiber(rawFiber);
        if (resolved && pct > 0 && pct <= 100) {
          this.addOrMergeFiber(targetList, {
            fiberName: resolved.canonicalName,
            category: resolved.category,
            percentage: pct,
            isLining,
          });
          found = true;
        }
      }

      if (!found) {
        while ((m = nameFirstRegex.exec(text)) !== null) {
          const rawFiber = m[1];
          const pct = parseFloat(m[2].replace(',', '.'));
          const resolved = resolveFiber(rawFiber);
          if (resolved && pct > 0 && pct <= 100) {
            this.addOrMergeFiber(targetList, {
              fiberName: resolved.canonicalName,
              category: resolved.category,
              percentage: pct,
              isLining,
            });
          }
        }
      }
    };

    for (const sec of rawSections) {
      if (sec.type === 'MAIN') {
        const currentSum = mainFibers.reduce((s, f) => s + f.percentage, 0);
        // Si ya tenemos una composición completa de tela base (>=99.5%), no duplicar con bloques repetidos
        if (currentSum < 99.5) {
          parseSectionText(sec.text, false, mainFibers);
        }
      } else if (sec.type === 'LINING') {
        const currentSum = liningFibers.reduce((s, f) => s + f.percentage, 0);
        if (currentSum < 99.5) {
          parseSectionText(sec.text, true, liningFibers);
        }
      } else if (sec.type === 'SECONDARY') {
        parseSectionText(sec.text, false, secondaryFibers);
      }
    }

    // Fallback: si no se detectó tela principal pero sí secciones secundarias (ej: prenda que solo reportó rib)
    const effectiveMain = mainFibers.length > 0 ? mainFibers : secondaryFibers;

    const normalizeList = (fibers: ParsedFiberItem[]): ParsedFiberItem[] => {
      if (fibers.length === 0) return [];
      for (const f of fibers) {
        f.percentage = Math.min(
          100,
          Math.max(0, Math.round(f.percentage * 10) / 10),
        );
      }
      const total = fibers.reduce((sum, f) => sum + f.percentage, 0);
      if (total > 100) {
        let running = 0;
        for (let i = 0; i < fibers.length; i++) {
          if (i === fibers.length - 1) {
            fibers[i].percentage = Math.max(
              0,
              Math.round((100 - running) * 10) / 10,
            );
          } else {
            fibers[i].percentage =
              Math.round(((fibers[i].percentage / total) * 100) * 10) / 10;
            running += fibers[i].percentage;
          }
        }
      }
      return fibers;
    };

    return [...normalizeList(effectiveMain), ...normalizeList(liningFibers)];
  }

  private addOrMergeFiber(
    list: ParsedFiberItem[],
    item: ParsedFiberItem,
  ): void {
    const existing = list.find(
      (f) => f.fiberName === item.fiberName && f.isLining === item.isLining,
    );
    if (existing) {
      existing.percentage = Math.min(
        100,
        Math.round((existing.percentage + item.percentage) * 10) / 10,
      );
    } else {
      list.push({
        ...item,
        percentage: Math.min(
          100,
          Math.max(0, Math.round(item.percentage * 10) / 10),
        ),
      });
    }
  }
}

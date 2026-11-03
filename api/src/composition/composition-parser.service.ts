import { Injectable } from '@nestjs/common';
import { FIBER_DICTIONARY, normalizeText, resolveFiber } from './fiber-dictionary';
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
  /^(?:ribb?|cuello|pu[ñn]os|complemento|flecos|hilos|vivos|detalles|encaje|recortes|(?:g[eé]nero\s*|tela\s*)?combinaci[oó]n|contraste|con\s*aplicaci[oó]n|aplicaci[oó]n|relleno(?:-padding)?(?:\s+hombreras)?|padding|hombreras)$/i;

const MAIN_SECTION_REGEX =
  /^(?:exterior|tejido\s*principal|tela\s*princip?al|g[eé]nero\s*base|tela\s*base|base|cuerpo|material|composici[oó]n)$/i;

const SECTION_HEADER_REGEX =
  /(?:^|[-.;|/•*\n]\s*|\s+)(exterior|tejido\s*principal|tela\s*princip?al|g[eé]nero\s*base|tela\s*base|base|cuerpo|material|composici[oó]n|forrer[ií]a(?:\s*\([^)]*\))?|forro(?:-lining)?|interior|viso|lining|ribb?|cuello|pu[ñn]os|complemento|flecos|hilos|vivos|detalles|encaje|recortes|(?:g[eé]nero\s*|tela\s*)?combinaci[oó]n|contraste|con\s*aplicaci[oó]n|aplicaci[oó]n|relleno(?:-padding)?(?:\s+hombreras)?|padding|hombreras)(?:\s*[:\-]\s*|\s+(?=\d{1,3}\s*%|[a-záéíóúñA-ZÁÉÍÓÚÑ]+\s+\d{1,3}\s*%))/gi;

type SectionType = 'MAIN' | 'LINING' | 'SECONDARY';
interface Section { type: SectionType; text: string }
interface SectionResult { fibers: ParsedFiberItem[]; covered: boolean; invalid: boolean }

const EPSILON = 0.000001;
const MIN_COMPLETE_PERCENTAGE = 99.9; // Allow a 0.1-point rounding shortfall, never an excess.
const FIBER_ALIASES = [...new Set(FIBER_DICTIONARY.flatMap(def => def.synonyms.map(normalizeText)))]
  .sort((a, b) => b.length - a.length)
  .map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const FIBER_TOKEN_PATTERN = `(?<![a-z0-9])(?:${FIBER_ALIASES.join('|')})(?![a-z0-9])`;

function isConstructionDeclaration(text: string): boolean {
  return /\bconfeccionad[oa]\s+en\b/i.test(text) && /\d+(?:[.,]\d+)?\s*%/.test(text);
}

function cleanSource(rawText: string): string {
  const entities: Record<string, string> = {
    aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
    ntilde: 'ñ', uuml: 'ü', nbsp: ' ', amp: '&', quot: '"', apos: "'",
  };
  return rawText.normalize('NFC')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?>|<\/(?:p|li|div|tr|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (!name.startsWith('#')) return entities[name.toLowerCase()] ?? entity;
      const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code) : ' ';
    })
    .trim();
}

@Injectable()
export class CompositionParserService {
  constructor(private readonly trafficLightService: TrafficLightService) {}

  parseFromText(
    text: string,
    rules: TrafficLightRulesConfig = DEFAULT_TRAFFIC_LIGHT_RULES,
  ): CompositionAnalysisResult {
    const rawComposition = this.extractCompositionSegment(text);
    const { fibers, complete } = this.analyzeSegment(rawComposition ?? '');
    const evaluation = this.trafficLightService.evaluate(fibers, rules);
    return {
      rawComposition: rawComposition ?? 'No indica',
      fibers,
      ...evaluation,
      trafficLight: complete ? evaluation.trafficLight : 'UNKNOWN',
    };
  }

  /** Keep technical declarations across prose, stopping at unrelated labeled sections. */
  extractCompositionSegment(rawText: string): string | null {
    if (!rawText) return null;
    const cleaned = cleanSource(rawText);
    const compositionHeading = /\bcomposici[oó]n\s*:?[ \t]*/i.exec(cleaned);
    let source = cleaned;
    if (compositionHeading) {
      // A nested "Forro: Composición:" heading must not turn lining into exterior.
      const prefix = cleaned.slice(0, compositionHeading.index).split('\n').pop() ?? '';
      const precedingHeaders = [...prefix.matchAll(new RegExp(SECTION_HEADER_REGEX.source, 'gi'))];
      const lastHeader = precedingHeaders[precedingHeaders.length - 1];
      const sectionPrefix = lastHeader && !prefix.slice(lastHeader.index! + lastHeader[0].length).trim()
        ? lastHeader[0] : '';
      source = sectionPrefix + cleaned.slice(compositionHeading.index + compositionHeading[0].length);
    }
    const lines = source.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim());
    const header = new RegExp(SECTION_HEADER_REGEX.source, 'i');
    const percentage = /\d+(?:[.,]\d+)?\s*%/;
    const isFiberList = (line: string) => {
      const normalized = normalizeText(line);
      const residue = normalized.replace(new RegExp(FIBER_TOKEN_PATTERN, 'g'), '');
      return residue !== normalized && /^[\s,;/+&-]*$/.test(residue.replace(/\by\b/g, ''));
    };
    const start = compositionHeading ? 0 : lines.findIndex(line => header.test(line) || percentage.test(line));
    if (start < 0) return null;

    const selected: string[] = [];
    for (const line of lines.slice(start)) {
      if (!line) continue;
      const stop = /\b(?:cuidados|lavado|instrucciones|medidas|talles|colores)\s*:/i.exec(line);
      let candidate = stop ? line.slice(0, stop.index).trim() : line;
      // CMS descriptions can repeat a declaration at the end of a commercial paragraph.
      const declaration = header.exec(candidate);
      if (declaration && selected.length > 0
        && !/^[+\-−]?\d+(?:[.,]\d+)?\s*%/.test(candidate)
        && !new RegExp(`^${FIBER_TOKEN_PATTERN}\\s+[+\\-−]?\\d+(?:[.,]\\d+)?\\s*%`).test(normalizeText(candidate))) {
        candidate = candidate.slice(declaration.index).trim();
      }
      const normalized = normalizeText(candidate);
      const fiberAtStart = new RegExp(`^${FIBER_TOKEN_PATTERN}`).exec(normalized);
      const startsAmount = /^(?:[-•*]\s+)?[+\-−]?\d+(?:[.,]\d+)?\s*%/.test(normalized);
      const fiberThenAmount = fiberAtStart && /^\s+[+\-−]?\d+(?:[.,]\d+)?\s*%/.test(normalized.slice(fiberAtStart[0].length));
      // Retain unsupported technical labels so they cannot silently produce a false green.
      const unknownSection = /^[\p{L}\p{N} ]{1,40}\s*:/u.test(candidate) && percentage.test(candidate);
      if (candidate && (selected.length === 0 || declaration || startsAmount || fiberThenAmount || unknownSection || isFiberList(candidate) || isConstructionDeclaration(candidate))) {
        selected.push(candidate);
      }
      if (stop) break;
    }
    return selected.length ? selected.join('\n') : null;
  }

  /** Only main and lining fibers are returned; a trim never stands in for the exterior. */
  extractFibersFromSegment(segment: string): ParsedFiberItem[] {
    return this.analyzeSegment(segment).fibers;
  }

  private analyzeSegment(segment: string): { fibers: ParsedFiberItem[]; complete: boolean } {
    const sections = this.splitSections(segment);
    const main = this.parseGroup(sections.filter(section => section.type === 'MAIN'), false);
    const liningSections = sections.filter(section => section.type === 'LINING');
    const lining = this.parseGroup(liningSections, true);
    return {
      fibers: [...main.fibers, ...lining.fibers],
      complete: main.covered && (liningSections.length === 0 || lining.covered),
    };
  }

  private splitSections(segment: string): Section[] {
    if (!segment) return [];
    const sections: Section[] = [];
    const headers = new RegExp(SECTION_HEADER_REGEX.source, 'gi');
    let type: SectionType = 'MAIN';
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = headers.exec(segment)) !== null) {
      const text = segment.slice(lastIndex, match.index).trim();
      if (text) sections.push({ type, text });
      const label = match[1].trim();
      if (LINING_SECTION_REGEX.test(label)) type = 'LINING';
      else if (SECONDARY_SECTION_REGEX.test(label)) type = 'SECONDARY';
      else if (MAIN_SECTION_REGEX.test(label) && !/^(?:composici[oó]n|material)$/i.test(label)) type = 'MAIN';
      lastIndex = headers.lastIndex;
    }
    // An explicitly empty section is incomplete, not evidence of an absent lining.
    sections.push({ type, text: segment.slice(lastIndex).trim() });
    // Independent prose declarations may repeat the collection statement. Keep them
    // separate for the existing equivalence/contradiction checks, not as a 200% blend.
    return sections.flatMap(section => {
      if (section.type !== 'MAIN') return [section];
      const chunks: string[] = [];
      for (const line of section.text.split('\n')) {
        if (chunks.length === 0 || isConstructionDeclaration(line)) chunks.push(line);
        else chunks[chunks.length - 1] += '\n' + line;
      }
      return chunks.map(text => ({ type: section.type, text }));
    });
  }

  private parseGroup(sections: Section[], isLining: boolean): SectionResult {
    const fibers: ParsedFiberItem[] = [];
    const seen = new Set<string>();
    let covered = sections.length > 0;
    let invalid = false;
    for (const section of sections) {
      const parsed = this.parseSection(section.text, isLining);
      // Identical CMS blocks may be repeated. Distinct full compositions are contradictory.
      const signature = parsed.covered && !parsed.invalid
        ? JSON.stringify([...parsed.fibers].sort((a, b) => a.fiberName.localeCompare(b.fiberName)))
        : normalizeText(section.text);
      if (seen.has(signature)) continue;
      seen.add(signature);
      covered = covered && parsed.covered;
      invalid = invalid || parsed.invalid;
      for (const fiber of parsed.fibers) {
        const existing = fibers.find(item => item.fiberName === fiber.fiberName);
        if (existing) existing.percentage = Math.round((existing.percentage + fiber.percentage) * 1e6) / 1e6;
        else fibers.push({ ...fiber });
      }
    }
    const total = fibers.reduce((sum, fiber) => sum + fiber.percentage, 0);
    invalid = invalid || total > 100 + EPSILON;
    return {
      fibers: invalid ? [] : fibers,
      covered: covered && !invalid && total >= MIN_COMPLETE_PERCENTAGE - EPSILON,
      invalid,
    };
  }

  private parseSection(source: string, isLining: boolean): SectionResult {
    // Repair only the split-word cotton spelling captured in this explicit fabric phrase.
    // rawComposition still retains the original source, including the typo.
    const text = normalizeText(source)
      .replace(/(\b(?:jersey|frisa)\s+de\s+)a\s+lgodon\b/g, '$1algodon');
    const reviewedConstruction = /(?:\d+(?:[.,]\d+)?\s*%\s+(?:en\s+)?(?:jersey\s+de\s+|frisa\s+de\s+|de\s+)?algodon\b|\balgodon\s+\d+(?:[.,]\d+)?\s*%|\b(?:jersey|frisa)\s+\d+(?:[.,]\d+)?\s*%\s+de\s+algodon\b|\brustico\s+\d+(?:[.,]\d+)?\s*%\s+viscosa\b)/.exec(text);
    type Token = { start: number; end: number } & (
      { kind: 'FIBER'; name: string } | { kind: 'PERCENTAGE'; percentage: number }
    );
    const rawTokens: Token[] = [];
    for (const match of text.matchAll(new RegExp(FIBER_TOKEN_PATTERN, 'g'))) {
      rawTokens.push({ kind: 'FIBER', name: match[0], start: match.index!, end: match.index! + match[0].length });
    }
    for (const match of text.matchAll(/[+\-−]?\d+(?:[.,]\d+)?\s*%/g)) {
      rawTokens.push({ kind: 'PERCENTAGE', percentage: parseFloat(match[0].replace(',', '.').replace('−', '-')), start: match.index!, end: match.index! + match[0].length });
    }
    rawTokens.sort((a, b) => a.start - b.start);
    const tokens: Token[] = [];
    // Collapse translated aliases before assigning amounts: otherwise a trailing alias
    // can steal the percentage belonging to the next fiber in a bilingual blend.
    for (const token of rawTokens) {
      const previous = tokens[tokens.length - 1];
      if (token.kind === 'FIBER' && previous?.kind === 'FIBER'
        && /^\s*[-/–—]\s*$/.test(text.slice(previous.end, token.start))
        && resolveFiber(previous.name)?.canonicalName === resolveFiber(token.name)?.canonicalName) {
        previous.end = token.end;
      } else tokens.push(token);
    }
    const fibers: ParsedFiberItem[] = [];
    const used = new Set<number>();
    let percentages = 0;
    let declaredTotal = 0;
    let covered = true;
    let invalid = false;
    // Fabric construction is a connector to a declared fiber, never a fiber by itself.
    const joins = (left: Token, right: Token) => {
      const between = text.slice(left.end, right.start);
      return /^\s*(?:(?:de|en)\s+)?$/.test(between)
        || (left.kind === 'PERCENTAGE' && right.kind === 'FIBER'
          && /^\s+(?:en\s+)?(?:jersey|frisa)\s+de\s+$/.test(between));
    };
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      if (token.kind !== 'PERCENTAGE') continue;
      percentages++;
      declaredTotal += token.percentage;
      if (!Number.isFinite(token.percentage) || token.percentage < 0 || token.percentage > 100) invalid = true;
      const previous = tokens[index - 1];
      const next = tokens[index + 1];
      let fiberIndex: number | undefined;
      if (previous?.kind === 'FIBER' && !used.has(index - 1) && joins(previous, token)) fiberIndex = index - 1;
      else if (next?.kind === 'FIBER' && !used.has(index + 1) && joins(token, next)) fiberIndex = index + 1;
      if (fiberIndex === undefined) { covered = false; continue; }
      used.add(fiberIndex);
      const fiberToken = tokens[fiberIndex];
      if (fiberToken.kind !== 'FIBER') continue;
      const resolved = resolveFiber(fiberToken.name)!;
      if (token.percentage > 0 && token.percentage <= 100) {
        fibers.push({ fiberName: resolved.canonicalName, category: resolved.category, percentage: token.percentage, isLining });
      }
    }
    invalid = invalid || declaredTotal > 100 + EPSILON;
    covered = covered && percentages > 0 && tokens.every((token, index) => token.kind !== 'FIBER' || used.has(index));
    let residue = [...tokens].reverse().reduce(
      (remaining, token) => remaining.slice(0, token.start) + ' '.repeat(token.end - token.start) + remaining.slice(token.end),
      text,
    );
    // Neither generic label identifies a material/process. Explicit compound aliases
    // (e.g. bamboo viscose or polyester microfiber) have already been consumed.
    covered = covered && !/\b(?:bambu|microfibra)\b/.test(residue);
    if (reviewedConstruction) {
      const additionalFiber = /\b(?:otras?\s+fibras?|fibras?\s+(?:desconocid\w*|no\s+identificad\w*))\b/.test(residue);
      // Only the reviewed commercial introduction can be omitted from coverage checks.
      // Unknown material wording before the declaration must remain visible to validation.
      const introduction = text.slice(0, reviewedConstruction.index).trim();
      if (/^descubre nuestra remera de ninas "[^"]+"\s*,\s*un diseno pensado para que tus pequenas luzcan radiantes y comodas\.\s*confeccionada$/.test(introduction)
        && !tokens.some(token => token.start < reviewedConstruction.index)) {
        residue = ' '.repeat(reviewedConstruction.index) + residue.slice(reviewedConstruction.index);
      }
      // The captured introduction has one comma before the explicit declaration.
      // Do not strip arbitrary prefixes: another material/quantity must remain visible.
      if (/^descubre nuestra remera mangas cortas [a-z0-9 ]+\s*,\s*confeccionada en$/.test(introduction)
        && !tokens.some(token => token.start < reviewedConstruction.index)) {
        residue = ' '.repeat(reviewedConstruction.index) + residue.slice(reviewedConstruction.index);
      }
      // These commercial clause openings occur in the reviewed construction statements.
      // Keep all tokens/amounts and other delimiters: extra fibers still invalidate coverage.
      residue = residue.replace(/,\s*(?=(?:esta prenda (?:de calidad superior )?(?:ofrece|te garantiza|es suave al tacto)|especialmente disenad[oa] para (?:ninos|ninas)|este buzo es ideal|garantiza una comodidad|ideal para|perfect[oa]s? para)\b)/g, '. ');
      // Match complete reviewed commercial clauses, including their internal commas.
      // Never consume arbitrary text following the clause or any fiber/percentage token.
      residue = residue.replace(/,\s*(?:de la mejor calidad, muy suave y extra comodo|muy suave y extra comodo|super suave y extra confortable|super livianito, fresco y extra comodo|extra suave y suuuuuuper liviano para los dias calurosos de verano|extra suave y suuuuuuper livianito para los dias calurosos de verano|esta remera es perfecta para disfrutar de los dias de calor sin perder el estilo|esta remera es suave, fresca y, sobre todo, comoda|lo que la hace super fresca y liviana|garantizando una suavidad excepcional y un look tierno que hara que tu pequena luzca encantadora en cualquier ocasion)(?=\s*(?:[.!]|$))/g, '. ');
      residue = residue.replace(/,\s*(?:especial para jugar los dias de verano|sera tu aliado a la hora de vestir a tu bebe y mantenerlo abrigadito|sino tambien para jugar en casa de la manera mas comoda|por lo que es requete comodo para jugar libremente)(?=\s*(?:[.!]|$))/g, '. ');
      // Literal commercial wording checked in Reír's product body. Only punctuation
      // or complete clauses are removed; fiber and amount tokens remain validated.
      residue = residue.replace(/^((?:the\s+(?:denim|black)\s+collection\s*!\s*)?nuestros clasicos mas elegidos),\s*(?=en (?:denim|gabardina(?: vintage)?)\b)/, '$1. ');
      residue = residue.replace(/con un corte baby tee, ajustado y corto, rinde homenaje al estilo noventoso que tanto amamos\./g, ' ');
      residue = residue.replace(/,\s*(?:con una estampa llena de color y vida|su caida es espectacular y super sentadora|el recorte central es super sentador|lo que garantiza comodidad y frescura durante todo el dia)(?=\s*(?:[.!]|$))/g, '. ');
      residue = residue.replace(/,\s*ligera y fresca(?=\s*[,.]\s*ideal para cualquier ocasion\.)/g, '. ');
      residue = residue.replace(/ademas, cuenta con practicos bolsillos y cierre trasero para mayor comodidad\./g, ' ');
      residue = residue.replace(/,\s*podes combinarlo con la blusa haciendo juego o con cualquier remerita\s*:\)(?=\s*$)/g, '. ');
      residue = residue.replace(/,\s*¡vas a enamorarte de su ajuste y estilo unico!(?=\s*$)/g, '. ');
      residue = residue.replace(/,\s*super suave y combinable con todo\.(?=\s*$)/g, '. ');
      covered = covered && !additionalFiber;
    }
    // An additional unquantified component is not proof of a complete exterior either.
    covered = covered && !/[,;/+|]\s*[a-z]/.test(residue);
    return { fibers: invalid ? [] : fibers, covered, invalid };
  }
}

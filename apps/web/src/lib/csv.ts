import { nextFepId, type FepDraft } from './form.ts';

export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvImportError';
  }
}

const NAME_HEADERS = new Set(['name', 'название', 'фэп']);
const EFFICIENCY_HEADERS = new Set([
  'efficiencypercent',
  'кпд',
  'кпд %',
  'кпд%',
]);

interface CsvRecord {
  lineNumber: number;
  cells: string[];
}

export interface CsvImportResult {
  feps: readonly FepDraft[];
  error: string | null;
  status: string | null;
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isNameHeader(header: string): boolean {
  return NAME_HEADERS.has(normalizeHeader(header));
}

function isEfficiencyHeader(header: string): boolean {
  const normalized = normalizeHeader(header);
  if (EFFICIENCY_HEADERS.has(normalized)) {
    return true;
  }
  return normalized.replace(/\s*%\s*$/u, '').trim() === 'кпд';
}

function isBlankRecord(cells: readonly string[]): boolean {
  return cells.length <= 1 && cells.every((cell) => cell.trim() === '');
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * RFC 4180-style CSV: comma delimiter, quoted fields, escaped `""`.
 * Does not invent extra dialects (semicolon, XLS).
 */
export function parseCsvRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let field = '';
  let quoted = false;
  let lineNumber = 1;
  let recordStartLine = 1;
  let index = 0;
  const source = stripBom(text);

  const pushField = (): void => {
    cells.push(field);
    field = '';
  };

  const pushRecord = (): void => {
    records.push({ lineNumber: recordStartLine, cells });
    cells = [];
    recordStartLine = lineNumber;
  };

  while (index < source.length) {
    const char = source[index];
    if (char === undefined) {
      break;
    }

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      if (char === '\n') {
        lineNumber += 1;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
      index += 1;
      continue;
    }

    if (char === ',') {
      pushField();
      index += 1;
      continue;
    }

    if (char === '\r') {
      pushField();
      index += source[index + 1] === '\n' ? 2 : 1;
      lineNumber += 1;
      pushRecord();
      continue;
    }

    if (char === '\n') {
      pushField();
      index += 1;
      lineNumber += 1;
      pushRecord();
      continue;
    }

    field += char;
    index += 1;
  }

  if (quoted) {
    throw new CsvImportError(
      `Строка ${String(recordStartLine)}: незакрытая кавычка.`,
    );
  }

  if (field !== '' || cells.length > 0) {
    pushField();
    pushRecord();
  }

  return records;
}

export function rejectUnsupportedTableFile(fileName: string): void {
  const lower = fileName.trim().toLowerCase();
  if (
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.ods')
  ) {
    throw new CsvImportError(
      'Поддерживается только формат CSV. Файлы Excel (XLS/XLSX) не загружаются.',
    );
  }
  if (!lower.endsWith('.csv')) {
    throw new CsvImportError('Поддерживается только файл с расширением .csv.');
  }
}

export function parseFepCsv(text: string): FepDraft[] {
  if (stripBom(text).trim() === '') {
    throw new CsvImportError('Файл CSV пустой.');
  }

  const records = parseCsvRecords(text);
  let header: CsvRecord | undefined;
  const data: CsvRecord[] = [];

  for (const record of records) {
    if (isBlankRecord(record.cells)) {
      continue;
    }
    if (header === undefined) {
      header = record;
    } else {
      data.push(record);
    }
  }

  if (header === undefined) {
    throw new CsvImportError('Файл CSV пустой.');
  }

  const nameIndex = header.cells.findIndex((cell) => isNameHeader(cell));
  const efficiencyIndex = header.cells.findIndex((cell) =>
    isEfficiencyHeader(cell),
  );

  if (nameIndex === -1) {
    throw new CsvImportError(
      'В CSV нет колонки названия (name / Название / ФЭП).',
    );
  }
  if (efficiencyIndex === -1) {
    throw new CsvImportError(
      'В CSV нет колонки КПД (efficiencyPercent / КПД / КПД %).',
    );
  }

  if (data.length === 0) {
    throw new CsvImportError('В CSV нет строк с данными ФЭП.');
  }

  const feps: FepDraft[] = [];

  for (const record of data) {
    const name = (record.cells[nameIndex] ?? '').trim();
    const rawEfficiency = (record.cells[efficiencyIndex] ?? '').trim();
    const line = String(record.lineNumber);

    if (name === '') {
      throw new CsvImportError(
        `Строка ${line}: название ФЭП не должно быть пустым.`,
      );
    }

    if (rawEfficiency === '') {
      throw new CsvImportError(`Строка ${line}: укажите КПД для «${name}».`);
    }

    const efficiencyPercent = Number(rawEfficiency.replace(',', '.'));
    if (!Number.isFinite(efficiencyPercent)) {
      throw new CsvImportError(
        `Строка ${line}: КПД «${name}» должно быть числом, получено «${rawEfficiency}».`,
      );
    }
    if (efficiencyPercent <= 0 || efficiencyPercent > 100) {
      throw new CsvImportError(
        `Строка ${line}: КПД «${name}» задаётся в процентах: больше 0 и не больше 100.`,
      );
    }

    feps.push({
      id: nextFepId(feps),
      name,
      efficiencyPercent: String(efficiencyPercent),
    });
  }

  return feps;
}

/**
 * Replaces the current FEP list only after the whole file is valid.
 * Invalid CSV keeps `current` intact.
 */
export function applyCsvImport(
  current: readonly FepDraft[],
  fileName: string,
  text: string,
): CsvImportResult {
  try {
    rejectUnsupportedTableFile(fileName);
    const feps = parseFepCsv(text);
    return {
      feps,
      error: null,
      status: `Загружено ФЭП: ${String(feps.length)}`,
    };
  } catch (error) {
    const message =
      error instanceof CsvImportError
        ? error.message
        : error instanceof Error && error.message.trim() !== ''
          ? error.message
          : 'Не удалось прочитать CSV.';
    return {
      feps: current,
      error: message,
      status: null,
    };
  }
}

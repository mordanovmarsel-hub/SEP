import { describe, expect, it } from 'vitest';
import { applyCsvImport, CsvImportError, parseFepCsv } from './csv.ts';
import { buildCalculationInput, DEFAULT_FORM, type FepDraft } from './form.ts';

const CURRENT: readonly FepDraft[] = [
  { id: 'keep-1', name: 'Уже введённый', efficiencyPercent: '25' },
];

describe('parseFepCsv', () => {
  it('parses a correct CSV with two or three FEP rows', () => {
    const feps = parseFepCsv(
      ['name,efficiencyPercent', 'ФЭП А,30', 'ФЭП Б,28.5', 'ФЭП В,32.1'].join(
        '\n',
      ),
    );

    expect(feps).toEqual([
      { id: 'fep-1', name: 'ФЭП А', efficiencyPercent: '30' },
      { id: 'fep-2', name: 'ФЭП Б', efficiencyPercent: '28.5' },
      { id: 'fep-3', name: 'ФЭП В', efficiencyPercent: '32.1' },
    ]);
  });

  it('accepts a fractional efficiency and quoted values', () => {
    const feps = parseFepCsv('name,efficiencyPercent\n"ФЭП, А",28.5\n');
    expect(feps).toEqual([
      { id: 'fep-1', name: 'ФЭП, А', efficiencyPercent: '28.5' },
    ]);
  });

  it('keeps UTF-8 Russian names and Russian header aliases', () => {
    const feps = parseFepCsv('Название,КПД %\nФЭП Солнечный,30\n');
    expect(feps[0]).toEqual({
      id: 'fep-1',
      name: 'ФЭП Солнечный',
      efficiencyPercent: '30',
    });
  });

  it('accepts ФЭП / КПД aliases and skips empty lines', () => {
    const feps = parseFepCsv('ФЭП,КПД\nФЭП А,30\n\n\nФЭП Б,28.5\n');
    expect(feps.map((fep) => fep.name)).toEqual(['ФЭП А', 'ФЭП Б']);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const feps = parseFepCsv('name,efficiencyPercent\n"ФЭП ""А""",30\n');
    expect(feps[0]?.name).toBe('ФЭП "А"');
  });

  it('assigns unique deterministic ids that do not depend on names', () => {
    const feps = parseFepCsv('name,efficiencyPercent\nОдинаковое,30\nОдинаковое,28\n');
    expect(feps.map((fep) => fep.id)).toEqual(['fep-1', 'fep-2']);
    expect(new Set(feps.map((fep) => fep.id)).size).toBe(2);
  });

  it('rejects an empty file', () => {
    expect(() => parseFepCsv('')).toThrow(CsvImportError);
    expect(() => parseFepCsv('   \n')).toThrow(/пустой/);
  });

  it('rejects a missing name column', () => {
    expect(() => parseFepCsv('efficiencyPercent\n30\n')).toThrow(
      /колонки названия/,
    );
  });

  it('rejects a missing efficiencyPercent column', () => {
    expect(() => parseFepCsv('name\nФЭП А\n')).toThrow(/колонки КПД/);
  });

  it('rejects an empty name', () => {
    expect(() => parseFepCsv('name,efficiencyPercent\n,30\n')).toThrow(
      /Строка 2: название/,
    );
  });

  it('rejects efficiency 0, above 100 and non-numeric values', () => {
    expect(() => parseFepCsv('name,efficiencyPercent\nФЭП А,0\n')).toThrow(
      /Строка 2: КПД/,
    );
    expect(() => parseFepCsv('name,efficiencyPercent\nФЭП А,100.1\n')).toThrow(
      /не больше 100/,
    );
    expect(() => parseFepCsv('name,efficiencyPercent\nФЭП А,NaN\n')).toThrow(
      /должно быть числом/,
    );
    expect(() => parseFepCsv('name,efficiencyPercent\nФЭП А,abc\n')).toThrow(
      /должно быть числом/,
    );
  });

  it('rejects a header-only file', () => {
    expect(() => parseFepCsv('name,efficiencyPercent\n')).toThrow(
      /нет строк с данными/,
    );
  });
});

describe('applyCsvImport', () => {
  it('replaces the current FEP list on a successful import', () => {
    const result = applyCsvImport(
      CURRENT,
      'cells.csv',
      'name,efficiencyPercent\nФЭП А,30\nФЭП Б,28.5\n',
    );

    expect(result.error).toBeNull();
    expect(result.status).toBe('Загружено ФЭП: 2');
    expect(result.feps).toEqual([
      { id: 'fep-1', name: 'ФЭП А', efficiencyPercent: '30' },
      { id: 'fep-2', name: 'ФЭП Б', efficiencyPercent: '28.5' },
    ]);
    expect(result.feps).not.toBe(CURRENT);
    expect(CURRENT[0]?.name).toBe('Уже введённый');
  });

  it('keeps already entered FEP data when the CSV is invalid', () => {
    const empty = applyCsvImport(CURRENT, 'empty.csv', '');
    expect(empty.feps).toBe(CURRENT);
    expect(empty.error).toMatch(/пустой/);
    expect(empty.status).toBeNull();

    const bad = applyCsvImport(
      CURRENT,
      'bad.csv',
      'name,efficiencyPercent\nФЭП А,abc\n',
    );
    expect(bad.feps).toBe(CURRENT);
    expect(bad.error).toMatch(/Строка 2/);
  });

  it('rejects XLS/XLSX without touching the current list', () => {
    const xlsx = applyCsvImport(CURRENT, 'table.xlsx', 'name,efficiencyPercent\nФЭП А,30\n');
    expect(xlsx.feps).toBe(CURRENT);
    expect(xlsx.error).toMatch(/только формат CSV/);
    expect(xlsx.error).toMatch(/XLS\/XLSX/);

    const xls = applyCsvImport(CURRENT, 'table.xls', 'name,efficiencyPercent\nФЭП А,30\n');
    expect(xls.feps).toBe(CURRENT);
    expect(xls.error).toMatch(/только формат CSV/);
  });

  it('produces drafts that pass buildCalculationInput validation', () => {
    const result = applyCsvImport(
      CURRENT,
      'cells.csv',
      'name,efficiencyPercent\nФЭП А,30\nФЭП Б,28.5\n',
    );
    expect(result.error).toBeNull();

    const input = buildCalculationInput({
      ...DEFAULT_FORM,
      feps: result.feps,
    });
    expect(input.photovoltaicCells).toEqual([
      { id: 'fep-1', name: 'ФЭП А', efficiency: 0.3 },
      { id: 'fep-2', name: 'ФЭП Б', efficiency: 0.285 },
    ]);
  });
});

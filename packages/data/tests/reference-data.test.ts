import { describe, expect, test } from 'vitest';
import type { ConcentratorMaterial, StructureType } from '@sep/core';
import * as data from '../src/index';
import {
  CONCENTRATOR_MATERIALS,
  CONCENTRATOR_MATERIALS_BY_ID,
  STRUCTURE_LABELS,
  STRUCTURES,
} from '../src/index';

const APPROVED_MATERIALS = [
  { id: 'caf2', name: 'CaF2', densityGPerCm3: 3.18 },
  { id: 'mgf2', name: 'MgF2', densityGPerCm3: 3.177 },
  { id: 'bk7', name: 'BK7', densityGPerCm3: 2.5 },
  {
    id: 'synthetic-uv-glass',
    name: 'Синтетическое стекло UV',
    densityGPerCm3: 2.202,
  },
  {
    id: 'quartz-glass',
    name: 'Кварцевое стекло',
    densityGPerCm3: 2.649,
  },
] as const satisfies readonly ConcentratorMaterial[];

describe('concentrator materials', () => {
  test('exports exactly the 5 approved materials', () => {
    expect(CONCENTRATOR_MATERIALS).toHaveLength(5);
    expect(CONCENTRATOR_MATERIALS).toEqual(APPROVED_MATERIALS);
  });

  test('densities match specification §8.2', () => {
    expect(CONCENTRATOR_MATERIALS.map((material) => material.densityGPerCm3)).toEqual([
      3.18,
      3.177,
      2.5,
      2.202,
      2.649,
    ]);
  });

  test('ids are stable and unique', () => {
    const ids = CONCENTRATOR_MATERIALS.map((material) => material.id);

    expect(ids).toEqual([
      'caf2',
      'mgf2',
      'bk7',
      'synthetic-uv-glass',
      'quartz-glass',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(CONCENTRATOR_MATERIALS_BY_ID)).toEqual(ids);
    expect(CONCENTRATOR_MATERIALS_BY_ID.caf2).toEqual(CONCENTRATOR_MATERIALS[0]);
  });

  test('names are non-empty', () => {
    for (const material of CONCENTRATOR_MATERIALS) {
      expect(material.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('structure presentation labels', () => {
  test('covers both constructions without physics coefficients', () => {
    expect(STRUCTURES).toEqual([
      { type: 'honeycomb', label: 'Сотопанель' },
      { type: 'frame', label: 'Каркас' },
    ]);

    const labels: Record<StructureType, string> = STRUCTURE_LABELS;
    expect(labels.honeycomb).toBe('Сотопанель');
    expect(labels.frame).toBe('Каркас');
  });
});

describe('catalogue boundary', () => {
  test('does not export a FEP / photovoltaic cell catalogue', () => {
    const exportedNames = Object.keys(data);

    expect(exportedNames.some((name) => /fep|photovoltaic|cell/i.test(name))).toBe(
      false,
    );
    expect('PHOTOVOLTAIC_CELLS' in data).toBe(false);
  });

  test('does not duplicate mass coefficients', () => {
    const exportedNames = Object.keys(data);

    expect(
      exportedNames.some((name) => /sigma|specificMass|kgPerM2/i.test(name)),
    ).toBe(false);
  });
});

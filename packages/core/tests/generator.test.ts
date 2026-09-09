import { describe, expect, it } from 'vitest';
import {
  GENERATOR_CONCENTRATIONS,
  SEP_AREA_STEP_M2,
  calculateSep,
  isStructurallyFeasible,
} from '../src/index';
import type {
  ConcentratorMaterial,
  PhotovoltaicCell,
  SepCalculationInput,
  SepSolution,
  StructureType,
} from '../src/index';

const AREA_TICKS_PER_M2 = 10;

const CELL: PhotovoltaicCell = {
  id: 'fep-a',
  name: 'Cell A',
  efficiency: 0.3,
};

const MATERIALS: readonly ConcentratorMaterial[] = [
  { id: 'mat-a', name: 'Material A', densityGPerCm3: 2.2 },
  { id: 'mat-b', name: 'Material B', densityGPerCm3: 2.5 },
];

function softInput(overrides: Partial<SepCalculationInput> = {}): SepCalculationInput {
  return {
    altitudeKm: 1200,
    maxMassKg: 1_000_000,
    requiredPowerW: 1,
    maxPanelAreaM2: 0.2,
    panelCount: 1,
    photovoltaicCells: [{ ...CELL }],
    structures: ['honeycomb', 'frame'],
    concentratorMaterials: MATERIALS.map((material) => ({ ...material })),
    ...overrides,
  };
}

function areaTicks(maxSepAreaM2: number): number[] {
  const ticks: number[] = [];
  for (let tick = 1; tick / AREA_TICKS_PER_M2 <= maxSepAreaM2; tick += 1) {
    ticks.push(tick);
  }
  return ticks;
}

interface LogicalTuple {
  photovoltaicCellId: string;
  structureType: StructureType;
  concentratorMaterialId: string | null;
  concentration: number;
  areaTick: number;
}

function tupleKey(tuple: LogicalTuple): string {
  return [
    tuple.photovoltaicCellId,
    tuple.structureType,
    tuple.concentratorMaterialId ?? 'null',
    String(tuple.concentration),
    String(tuple.areaTick),
  ].join('|');
}

function solutionTuple(solution: SepSolution): LogicalTuple {
  return {
    photovoltaicCellId: solution.photovoltaicCellId,
    structureType: solution.structureType,
    concentratorMaterialId: solution.concentratorMaterialId,
    concentration: solution.concentration,
    areaTick: Math.round(solution.sepAreaM2 * AREA_TICKS_PER_M2),
  };
}

/**
 * Independent combinatorial enumerator of the Issue #12 generator space.
 * Does not call calculateSep, cosine, power, mass, or Pareto.
 */
function enumerateLogicalTuples(input: SepCalculationInput): LogicalTuple[] {
  const maxSepAreaM2 = input.maxPanelAreaM2 * input.panelCount;
  const ticks = areaTicks(maxSepAreaM2);
  const tuples: LogicalTuple[] = [];

  for (const cell of input.photovoltaicCells) {
    for (const structureType of input.structures) {
      for (const concentration of GENERATOR_CONCENTRATIONS) {
        if (!isStructurallyFeasible(structureType, concentration)) {
          continue;
        }

        if (concentration === 1) {
          for (const areaTick of ticks) {
            tuples.push({
              photovoltaicCellId: cell.id,
              structureType,
              concentratorMaterialId: null,
              concentration,
              areaTick,
            });
          }
          continue;
        }

        for (const material of input.concentratorMaterials) {
          for (const areaTick of ticks) {
            tuples.push({
              photovoltaicCellId: cell.id,
              structureType,
              concentratorMaterialId: material.id,
              concentration,
              areaTick,
            });
          }
        }
      }
    }
  }

  return tuples;
}

describe('generator enumeration', () => {
  it('emits every valid combination and no invalid ones, in nested-loop order', () => {
    const input = softInput();
    const result = calculateSep(input);
    const expected = enumerateLogicalTuples(input);

    expect(result.solutions.map(solutionTuple).map(tupleKey)).toEqual(
      expected.map(tupleKey),
    );
  });

  it('has no duplicate ids and no duplicate logical tuples', () => {
    const result = calculateSep(softInput());
    const ids = result.solutions.map((solution) => solution.id);
    const tuples = result.solutions.map(solutionTuple).map(tupleKey);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(tuples).size).toBe(tuples.length);
  });

  it('does not duplicate K=1 once per concentrator material', () => {
    const input = softInput();
    const k1 = calculateSep(input).solutions.filter(
      (solution) => solution.concentration === 1,
    );

    expect(k1.length).toBe(input.structures.length * areaTicks(0.2).length);
    expect(k1.every((solution) => solution.concentratorMaterialId === null)).toBe(
      true,
    );
    expect(k1.every((solution) => solution.concentratorMaterialName === null)).toBe(
      true,
    );
  });

  it('generates honeycomb only at K=1 and K=2', () => {
    const honeycomb = calculateSep(softInput()).solutions.filter(
      (solution) => solution.structureType === 'honeycomb',
    );
    const concentrations = new Set(honeycomb.map((solution) => solution.concentration));

    expect([...concentrations].sort((left, right) => left - right)).toEqual([1, 2]);
    expect(honeycomb.every((solution) => solution.concentration <= 2)).toBe(true);
  });

  it('generates frame at every integer K from 1 to 9', () => {
    const frame = calculateSep(softInput()).solutions.filter(
      (solution) => solution.structureType === 'frame',
    );
    const concentrations = new Set(frame.map((solution) => solution.concentration));

    expect([...concentrations].sort((left, right) => left - right)).toEqual([
      ...GENERATOR_CONCENTRATIONS,
    ]);
  });

  it('steps S_SEP by 0.1 and never exceeds S_max', () => {
    const maxSepAreaM2 = 0.2;
    const result = calculateSep(softInput({ maxPanelAreaM2: maxSepAreaM2, panelCount: 1 }));
    const areas = [...new Set(result.solutions.map((solution) => solution.sepAreaM2))].sort(
      (left, right) => left - right,
    );

    expect(areas).toEqual([0.1, 0.2]);
    expect(
      result.solutions.every((solution) => solution.sepAreaM2 <= maxSepAreaM2),
    ).toBe(true);
    expect(
      result.solutions.every(
        (solution) =>
          Number.isInteger(Math.round(solution.sepAreaM2 * AREA_TICKS_PER_M2)) &&
          Math.abs(
            solution.sepAreaM2 * AREA_TICKS_PER_M2 -
              Math.round(solution.sepAreaM2 * AREA_TICKS_PER_M2),
          ) < 1e-12,
      ),
    ).toBe(true);
    expect(SEP_AREA_STEP_M2).toBe(0.1);
  });

  it('keeps only n*0.1 <= S_max when S_max is not a multiple of 0.1', () => {
    const result = calculateSep(softInput({ maxPanelAreaM2: 0.25, panelCount: 1 }));
    const areas = [...new Set(result.solutions.map((solution) => solution.sepAreaM2))].sort(
      (left, right) => left - right,
    );

    expect(areas).toEqual([0.1, 0.2]);
    expect(areas.every((area) => area <= 0.25)).toBe(true);
    expect(areas.includes(0.3)).toBe(false);
  });

  it('sets S_FEP = S_SEP / K on every solution', () => {
    const result = calculateSep(softInput());

    for (const solution of result.solutions) {
      expect(solution.fepAreaM2).toBe(solution.sepAreaM2 / solution.concentration);
    }
  });

  it('still generates K=1 when concentratorMaterials is empty', () => {
    const result = calculateSep(softInput({ concentratorMaterials: [] }));
    const expected = enumerateLogicalTuples(softInput({ concentratorMaterials: [] }));

    expect(result.totalGenerated).toBe(4);
    expect(result.solutions).toHaveLength(4);
    expect(result.solutions.every((solution) => solution.concentration === 1)).toBe(
      true,
    );
    expect(result.solutions.map(solutionTuple).map(tupleKey)).toEqual(
      expected.map(tupleKey),
    );
  });

  it('returns zero candidates without crashing when S_max < 0.1', () => {
    const result = calculateSep(softInput({ maxPanelAreaM2: 0.05, panelCount: 1 }));

    expect(result.totalGenerated).toBe(0);
    expect(result.totalFeasible).toBe(0);
    expect(result.solutions).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  GENERATOR_CONCENTRATIONS,
  SepCalculationError,
  calculateAverageCosine,
  calculateAveragePower,
  calculateMass,
  calculateSep,
  evaluateConstraints,
  markParetoSolutions,
} from '../src/index';
import type {
  ConcentratorMaterial,
  PhotovoltaicCell,
  SepCalculationInput,
} from '../src/index';

const FIXTURE_CELL: PhotovoltaicCell = {
  id: 'fixture-fep',
  name: 'Fixture FEP',
  efficiency: 0.3,
};

const FIXTURE_MATERIALS: readonly ConcentratorMaterial[] = [
  { id: 'glass-a', name: 'Glass A', densityGPerCm3: 2.2 },
  { id: 'glass-b', name: 'Glass B', densityGPerCm3: 2.5 },
];

/**
 * Issue #12 §10 frozen fixture:
 * 1 FEP, 2 structures, 2 materials, S_max = 0.2 m², soft constraints.
 */
function fixtureInput(overrides: Partial<SepCalculationInput> = {}): SepCalculationInput {
  return {
    altitudeKm: 1200,
    maxMassKg: 1_000_000,
    requiredPowerW: 1,
    maxPanelAreaM2: 0.2,
    panelCount: 1,
    photovoltaicCells: [{ ...FIXTURE_CELL }],
    structures: ['honeycomb', 'frame'],
    concentratorMaterials: FIXTURE_MATERIALS.map((material) => ({ ...material })),
    ...overrides,
  };
}

function freezeInput(input: SepCalculationInput): SepCalculationInput {
  return Object.freeze({
    ...input,
    photovoltaicCells: Object.freeze(
      input.photovoltaicCells.map((cell) => Object.freeze({ ...cell })),
    ),
    structures: Object.freeze([...input.structures]),
    concentratorMaterials: Object.freeze(
      input.concentratorMaterials.map((material) => Object.freeze({ ...material })),
    ),
    paretoCriteria: input.paretoCriteria
      ? Object.freeze([...input.paretoCriteria])
      : undefined,
  });
}

function expectInvariants(result: ReturnType<typeof calculateSep>, input: SepCalculationInput): void {
  const maxSepAreaM2 = input.maxPanelAreaM2 * input.panelCount;

  expect(result.totalFeasible).toBe(result.solutions.length);
  expect(new Set(result.solutions.map((solution) => solution.id)).size).toBe(
    result.solutions.length,
  );

  for (const solution of result.solutions) {
    expect(solution.fepAreaM2).toBe(solution.sepAreaM2 / solution.concentration);
    expect(solution.specificMassKgPerM2).toBe(solution.totalMassKg / solution.sepAreaM2);
    expect(solution.powerToMassWPerKg).toBe(solution.averagePowerW / solution.totalMassKg);
    expect(solution.sepAreaM2).toBeLessThanOrEqual(maxSepAreaM2);
    expect(solution.sepAreaM2).toBeGreaterThan(0);
    expect(solution.altitudeKm).toBe(input.altitudeKm);
    expect(solution.concentration).toBeGreaterThanOrEqual(1);
    expect(solution.concentration).toBeLessThanOrEqual(9);
    expect(Number.isInteger(solution.concentration)).toBe(true);

    if (solution.structureType === 'honeycomb') {
      expect(solution.concentration).toBeLessThanOrEqual(2);
    }

    if (solution.concentration === 1) {
      expect(solution.concentratorMaterialId).toBeNull();
      expect(solution.concentratorMaterialName).toBeNull();
      expect(solution.concentratorMassKg).toBe(0);
    } else {
      expect(solution.concentratorMaterialId).not.toBeNull();
      expect(solution.concentratorMaterialName).not.toBeNull();
    }

    expect(typeof solution.isPareto).toBe('boolean');
  }
}

describe('calculateSep', () => {
  describe('Issue #12 §10 fixture', () => {
    it('counts totalGenerated = 40, totalFeasible = 40, solutions.length = 40', () => {
      const result = calculateSep(fixtureInput());

      expect(result.totalGenerated).toBe(40);
      expect(result.totalFeasible).toBe(40);
      expect(result.solutions).toHaveLength(40);
      expect(result.totalFeasible).toBe(result.solutions.length);
    });

    it('splits the 40 candidates as honeycomb 6 + frame 34', () => {
      const result = calculateSep(fixtureInput());
      const honeycomb = result.solutions.filter(
        (solution) => solution.structureType === 'honeycomb',
      );
      const frame = result.solutions.filter((solution) => solution.structureType === 'frame');

      expect(honeycomb).toHaveLength(6);
      expect(frame).toHaveLength(34);
      expect(
        honeycomb.filter((solution) => solution.concentration === 1),
      ).toHaveLength(2);
      expect(
        honeycomb.filter((solution) => solution.concentration === 2),
      ).toHaveLength(4);
      expect(frame.filter((solution) => solution.concentration === 1)).toHaveLength(2);
      expect(
        frame.filter((solution) => solution.concentration >= 2),
      ).toHaveLength(32);
    });
  });

  it('wires cosine, power, mass, constraints and Pareto without ad-hoc margins', () => {
    const input = fixtureInput();
    const result = calculateSep(input);
    const sample = result.solutions.find(
      (solution) =>
        solution.structureType === 'frame' &&
        solution.concentration === 2 &&
        solution.concentratorMaterialId === 'glass-b' &&
        solution.sepAreaM2 === 0.2,
    );

    expect(sample).toBeDefined();
    if (sample === undefined) {
      return;
    }

    const averageCosine = calculateAverageCosine({
      altitudeKm: input.altitudeKm,
      concentration: 2,
    });
    const averagePowerW = calculateAveragePower({
      sepAreaM2: 0.2,
      fepEfficiency: FIXTURE_CELL.efficiency,
      concentration: 2,
      averageCosine,
    });
    const mass = calculateMass({
      sepAreaM2: 0.2,
      concentration: 2,
      structureType: 'frame',
      concentratorDensityGPerCm3: 2.5,
    });
    const constraints = evaluateConstraints({
      averagePowerW,
      requiredPowerW: input.requiredPowerW,
      totalMassKg: mass.totalMassKg,
      maxMassKg: input.maxMassKg,
      sepAreaM2: 0.2,
      maxSepAreaM2: 0.2,
      altitudeKm: input.altitudeKm,
      concentration: 2,
      structureType: 'frame',
    });

    expect(sample.averageCosine).toBe(averageCosine);
    expect(sample.averagePowerW).toBe(averagePowerW);
    expect(sample.structureMassKg).toBe(mass.structureMassKg);
    expect(sample.concentratorMassKg).toBe(mass.concentratorMassKg);
    expect(sample.totalMassKg).toBe(mass.totalMassKg);
    expect(sample.powerMarginW).toBe(constraints.powerMarginW);
    expect(sample.massMarginKg).toBe(constraints.massMarginKg);
    expect(sample.areaMarginM2).toBe(constraints.areaMarginM2);
    expect(sample.fepAreaM2).toBe(0.2 / 2);

    const remarked = markParetoSolutions(
      result.solutions.map((solution) => ({ ...solution, isPareto: false })),
      input.paretoCriteria,
    );
    expect(result.solutions.map((solution) => solution.isPareto)).toEqual(
      remarked.map((solution) => solution.isPareto),
    );
  });

  it('returns identical output for the same input, including ids, order, numbers and Pareto flags', () => {
    const input = fixtureInput();
    const first = calculateSep(input);
    const second = calculateSep(input);

    expect(second).toEqual(first);
    expect(second.solutions.map((solution) => solution.id)).toEqual(
      first.solutions.map((solution) => solution.id),
    );
    expect(second.solutions.map((solution) => solution.isPareto)).toEqual(
      first.solutions.map((solution) => solution.isPareto),
    );
  });

  it('returns zero feasible solutions, not an error, when requiredPower is very high', () => {
    const result = calculateSep(fixtureInput({ requiredPowerW: 1e12 }));

    expect(result.totalGenerated).toBe(40);
    expect(result.totalFeasible).toBe(0);
    expect(result.solutions).toEqual([]);
  });

  it('does not mutate frozen input arrays or objects', () => {
    const input = freezeInput(fixtureInput());
    const cellsBefore = [...input.photovoltaicCells];
    const structuresBefore = [...input.structures];
    const materialsBefore = [...input.concentratorMaterials];

    const result = calculateSep(input);

    expect(result.totalGenerated).toBe(40);
    expect(input.photovoltaicCells).toEqual(cellsBefore);
    expect(input.structures).toEqual(structuresBefore);
    expect(input.concentratorMaterials).toEqual(materialsBefore);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(input.photovoltaicCells)).toBe(true);
    expect(Object.isFrozen(input.structures)).toBe(true);
    expect(Object.isFrozen(input.concentratorMaterials)).toBe(true);
  });

  it('throws SepCalculationError on invalid input and does not return a partial result', () => {
    expect(() => calculateSep(fixtureInput({ altitudeKm: 399 }))).toThrow(
      SepCalculationError,
    );
    expect(() => calculateSep(fixtureInput({ photovoltaicCells: [] }))).toThrow(
      SepCalculationError,
    );
  });

  it('uses unique deterministic ids derived from FEP, structure, material, H, K and area tick', () => {
    const result = calculateSep(fixtureInput());
    const ids = result.solutions.map((solution) => solution.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(result.solutions[0]?.id).toBe('fixture-fep|honeycomb|null|1200|1|1');
    expect(
      result.solutions.find(
        (solution) =>
          solution.structureType === 'frame' &&
          solution.concentration === 2 &&
          solution.concentratorMaterialId === 'glass-a' &&
          solution.sepAreaM2 === 0.2,
      )?.id,
    ).toBe('fixture-fep|frame|glass-a|1200|2|2');
  });

  it('keeps totalFeasible === solutions.length after filtering', () => {
    const result = calculateSep(fixtureInput({ maxMassKg: 0.2, requiredPowerW: 20 }));

    expect(result.totalGenerated).toBe(40);
    expect(result.totalFeasible).toBe(result.solutions.length);
    expect(result.solutions.length).toBeLessThan(40);
    expect(result.solutions.length).toBeGreaterThan(0);
  });
});

describe('calculateSep property-style invariant grid', () => {
  const altitudesKm = [400, 1200, 2400, 3600];
  const efficiencies = [0.1, 0.3, 1];
  const requiredPowersW = [1, 80, 1e9];
  const maxMassesKg = [0.05, 5, 1e6];

  it('holds invariants on every returned solution across H / efficiency / limits', () => {
    for (const altitudeKm of altitudesKm) {
      for (const efficiency of efficiencies) {
        for (const requiredPowerW of requiredPowersW) {
          for (const maxMassKg of maxMassesKg) {
            const input = fixtureInput({
              altitudeKm,
              requiredPowerW,
              maxMassKg,
              photovoltaicCells: [
                {
                  id: 'grid-fep',
                  name: 'Grid FEP',
                  efficiency,
                },
              ],
            });
            const result = calculateSep(input);

            expect(result.totalGenerated).toBe(40);
            expectInvariants(result, input);

            for (const solution of result.solutions) {
              const constraints = evaluateConstraints({
                averagePowerW: solution.averagePowerW,
                requiredPowerW: input.requiredPowerW,
                totalMassKg: solution.totalMassKg,
                maxMassKg: input.maxMassKg,
                sepAreaM2: solution.sepAreaM2,
                maxSepAreaM2: input.maxPanelAreaM2 * input.panelCount,
                altitudeKm: input.altitudeKm,
                concentration: solution.concentration,
                structureType: solution.structureType,
              });

              expect(constraints.isFeasible).toBe(true);
              expect(solution.powerMarginW).toBe(constraints.powerMarginW);
              expect(solution.massMarginKg).toBe(constraints.massMarginKg);
              expect(solution.areaMarginM2).toBe(constraints.areaMarginM2);
              expect(GENERATOR_CONCENTRATIONS).toContain(solution.concentration);
            }
          }
        }
      }
    }
  });
});

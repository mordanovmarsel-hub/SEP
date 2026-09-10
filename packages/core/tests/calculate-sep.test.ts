import { describe, expect, it } from 'vitest';
import {
  GENERATOR_CONCENTRATIONS,
  ParetoError,
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
  ParetoMetric,
  PhotovoltaicCell,
  SepCalculationInput,
} from '../src/index';
import {
  effectiveMaxSepAreaM2,
  maxAreaTickCount,
} from '../src/generator/calculate-sep';

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

/**
 * Same integer-tick reading of S_max as production: if the raw product is
 * within a few ULPs of n*0.1, expected max is n*0.1 (last included tick).
 * `0.25` stays 0.25; `0.3 * 3` becomes 0.9.
 */
function expectedMaxSepAreaM2(input: SepCalculationInput): number {
  return effectiveMaxSepAreaM2(input.maxPanelAreaM2 * input.panelCount);
}

function expectInvariants(result: ReturnType<typeof calculateSep>, input: SepCalculationInput): void {
  const maxSepAreaM2 = expectedMaxSepAreaM2(input);

  expect(result.totalFeasible).toBe(result.solutions.length);
  expect(new Set(result.solutions.map((solution) => solution.id)).size).toBe(
    result.solutions.length,
  );

  for (const solution of result.solutions) {
    expect(solution.fepAreaM2).toBe(solution.sepAreaM2 / solution.concentration);
    expect(solution.specificMassKgPerM2).toBe(solution.totalMassKg / solution.sepAreaM2);
    expect(solution.powerToMassWPerKg).toBe(solution.averagePowerW / solution.totalMassKg);
    expect(solution.averagePowerW).toBeGreaterThanOrEqual(input.requiredPowerW);
    expect(solution.totalMassKg).toBeLessThanOrEqual(input.maxMassKg);
    expect(solution.sepAreaM2).toBeLessThanOrEqual(maxSepAreaM2);
    expect(solution.powerMarginW).toBe(solution.averagePowerW - input.requiredPowerW);
    expect(solution.massMarginKg).toBe(input.maxMassKg - solution.totalMassKg);
    expect(solution.areaMarginM2).toBe(maxSepAreaM2 - solution.sepAreaM2);
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

    it('still counts totalGenerated = 40 when S_max is exactly 0.2 * 1', () => {
      const result = calculateSep(fixtureInput({ maxPanelAreaM2: 0.2, panelCount: 1 }));

      expect(result.totalGenerated).toBe(40);
      expect(
        [...new Set(result.solutions.map((solution) => solution.sepAreaM2))].sort(
          (left, right) => left - right,
        ),
      ).toEqual([0.1, 0.2]);
    });
  });

  it('includes 0.9 for both 0.3*3 and 0.9*1 (IEEE product must not drop the last tick)', () => {
    const expectedAreas = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const fromProduct = calculateSep(
      fixtureInput({ maxPanelAreaM2: 0.3, panelCount: 3 }),
    );
    const fromSingle = calculateSep(
      fixtureInput({ maxPanelAreaM2: 0.9, panelCount: 1 }),
    );
    const productAreas = [
      ...new Set(fromProduct.solutions.map((solution) => solution.sepAreaM2)),
    ].sort((left, right) => left - right);
    const singleAreas = [
      ...new Set(fromSingle.solutions.map((solution) => solution.sepAreaM2)),
    ].sort((left, right) => left - right);

    expect(productAreas).toEqual(expectedAreas);
    expect(singleAreas).toEqual(expectedAreas);
    expect(productAreas).toEqual(singleAreas);
    expect(fromProduct.totalGenerated).toBe(fromSingle.totalGenerated);
    expect(fromProduct.totalGenerated).toBe(180);

    const productInput = fixtureInput({ maxPanelAreaM2: 0.3, panelCount: 3 });
    expectInvariants(fromProduct, productInput);
    const lastTick = fromProduct.solutions.filter((solution) => solution.sepAreaM2 === 0.9);
    expect(lastTick.length).toBeGreaterThan(0);
    for (const solution of lastTick) {
      expect(solution.areaMarginM2).toBe(0);
      expect(solution.sepAreaM2).toBeLessThanOrEqual(expectedMaxSepAreaM2(productInput));
    }
  });

  it('snaps 0.09*10 and 0.6*3 the same way as an exact grid S_max', () => {
    const fromProductA = calculateSep(
      fixtureInput({ maxPanelAreaM2: 0.09, panelCount: 10 }),
    );
    const fromExactA = calculateSep(
      fixtureInput({ maxPanelAreaM2: 0.9, panelCount: 1 }),
    );
    const fromProductB = calculateSep(
      fixtureInput({ maxPanelAreaM2: 0.6, panelCount: 3 }),
    );
    const fromExactB = calculateSep(
      fixtureInput({ maxPanelAreaM2: 1.8, panelCount: 1 }),
    );

    const areas = (result: ReturnType<typeof calculateSep>): number[] =>
      [...new Set(result.solutions.map((solution) => solution.sepAreaM2))].sort(
        (left, right) => left - right,
      );

    expect(areas(fromProductA).at(-1)).toBe(0.9);
    expect(areas(fromProductA)).toEqual(areas(fromExactA));
    expect(areas(fromProductB).at(-1)).toBe(1.8);
    expect(areas(fromProductB)).toEqual(areas(fromExactB));
  });

  it('does not snap 0.9 - 5e-11 up to 0.9: last tick is 0.8', () => {
    const result = calculateSep(
      fixtureInput({ maxPanelAreaM2: 0.9 - 5e-11, panelCount: 1 }),
    );
    const areas = [
      ...new Set(result.solutions.map((solution) => solution.sepAreaM2)),
    ].sort((left, right) => left - right);

    expect(areas.at(-1)).toBe(0.8);
    expect(areas.includes(0.9)).toBe(false);
    expect(maxAreaTickCount(0.9 - 5e-11)).toBe(8);
  });

  it('does not round 0.25 up: last tick is 0.2, not 0.3', () => {
    const result = calculateSep(fixtureInput({ maxPanelAreaM2: 0.25, panelCount: 1 }));
    const areas = [
      ...new Set(result.solutions.map((solution) => solution.sepAreaM2)),
    ].sort((left, right) => left - right);

    expect(areas.at(-1)).toBe(0.2);
    expect(areas.includes(0.3)).toBe(false);
    expect(areas).toEqual([0.1, 0.2]);
    expect(result.totalGenerated).toBe(40);
  });

  it('throws SepCalculationError when S_max overflows to non-finite', () => {
    expect(() =>
      calculateSep(fixtureInput({ maxPanelAreaM2: Number.MAX_VALUE, panelCount: 2 })),
    ).toThrow(SepCalculationError);
    expect(() =>
      calculateSep(fixtureInput({ maxPanelAreaM2: 1e308, panelCount: 10 })),
    ).toThrow(/S_max/);
    expect(() =>
      calculateSep(fixtureInput({ maxPanelAreaM2: Number.MAX_VALUE, panelCount: 1 })),
    ).toThrow(/S_max/);
  });

  it('throws SepCalculationError, not ParetoError, for empty or unknown paretoCriteria', () => {
    const emptyCases: Array<() => void> = [
      () => {
        calculateSep(fixtureInput({ paretoCriteria: [] }));
      },
      () => {
        calculateSep(
          fixtureInput({
            paretoCriteria: ['notAMetric' as unknown as ParetoMetric],
          }),
        );
      },
    ];

    for (const run of emptyCases) {
      try {
        run();
        expect.unreachable('invalid paretoCriteria must throw');
      } catch (error) {
        expect(error).toBeInstanceOf(SepCalculationError);
        expect(error).not.toBeInstanceOf(ParetoError);
      }
    }
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
    expect(() =>
      calculateSep(fixtureInput({ structures: ['honeycomb', 'honeycomb'] })),
    ).toThrow(SepCalculationError);
  });

  it('uses unique deterministic ids derived from FEP, structure, material, H, K and area tick', () => {
    const result = calculateSep(fixtureInput());
    const ids = result.solutions.map((solution) => solution.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(result.solutions[0]?.id).toBe(
      JSON.stringify(['fixture-fep', 'honeycomb', null, 1200, 1, 1]),
    );
    expect(
      result.solutions.find(
        (solution) =>
          solution.structureType === 'frame' &&
          solution.concentration === 2 &&
          solution.concentratorMaterialId === 'glass-a' &&
          solution.sepAreaM2 === 0.2,
      )?.id,
    ).toBe(JSON.stringify(['fixture-fep', 'frame', 'glass-a', 1200, 2, 2]));
  });

  it('does not collide when FEP or material ids contain a pipe', () => {
    const left = calculateSep(
      fixtureInput({
        photovoltaicCells: [{ id: 'x|frame', name: 'Left', efficiency: 0.3 }],
        concentratorMaterials: [{ id: 'y', name: 'Y', densityGPerCm3: 2.2 }],
        structures: ['frame'],
        maxPanelAreaM2: 0.1,
        panelCount: 1,
      }),
    );
    const right = calculateSep(
      fixtureInput({
        photovoltaicCells: [{ id: 'x', name: 'Right', efficiency: 0.3 }],
        concentratorMaterials: [{ id: 'frame|y', name: 'Y', densityGPerCm3: 2.2 }],
        structures: ['frame'],
        maxPanelAreaM2: 0.1,
        panelCount: 1,
      }),
    );
    const leftK2 = left.solutions.find((solution) => solution.concentration === 2);
    const rightK2 = right.solutions.find((solution) => solution.concentration === 2);

    expect(leftK2?.id).toBe(
      JSON.stringify(['x|frame', 'frame', 'y', 1200, 2, 1]),
    );
    expect(rightK2?.id).toBe(
      JSON.stringify(['x', 'frame', 'frame|y', 1200, 2, 1]),
    );
    expect(leftK2?.id).not.toBe(rightK2?.id);
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
              const maxSepAreaM2 = expectedMaxSepAreaM2(input);
              expect(solution.averagePowerW).toBeGreaterThanOrEqual(input.requiredPowerW);
              expect(solution.totalMassKg).toBeLessThanOrEqual(input.maxMassKg);
              expect(solution.sepAreaM2).toBeLessThanOrEqual(maxSepAreaM2);
              expect(solution.powerMarginW).toBe(
                solution.averagePowerW - input.requiredPowerW,
              );
              expect(solution.massMarginKg).toBe(input.maxMassKg - solution.totalMassKg);
              expect(solution.areaMarginM2).toBe(maxSepAreaM2 - solution.sepAreaM2);

              const constraints = evaluateConstraints({
                averagePowerW: solution.averagePowerW,
                requiredPowerW: input.requiredPowerW,
                totalMassKg: solution.totalMassKg,
                maxMassKg: input.maxMassKg,
                sepAreaM2: solution.sepAreaM2,
                maxSepAreaM2,
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

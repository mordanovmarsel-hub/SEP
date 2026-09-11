import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import {
  CONSTRAINT_VIOLATION_ORDER,
  DEFAULT_PARETO_CRITERIA,
  EFFICIENCY_MODEL,
  GENERATOR_CONCENTRATIONS,
  HONEYCOMB_MAX_CONCENTRATION,
  PARETO_METRIC_SENSE,
  STRUCTURE_MAX_CONCENTRATION,
  SepCalculationError,
} from '../src/index';
import type {
  ConcentratorMaterial,
  ConstraintEvaluation,
  ConstraintParams,
  ConstraintsApi,
  PhotovoltaicCell,
  SepCalculationInput,
  SepCalculationResult,
  SepSolution,
} from '../src/index';

test('public v1 contracts are constructible and CONSTANT-only', () => {
  expect(EFFICIENCY_MODEL).toBe('CONSTANT');
  expect(GENERATOR_CONCENTRATIONS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  expect(HONEYCOMB_MAX_CONCENTRATION).toBe(2.3);
  expect(STRUCTURE_MAX_CONCENTRATION.honeycomb).toBe(2.3);
  expect(STRUCTURE_MAX_CONCENTRATION.frame).toBe(9);
  expect(DEFAULT_PARETO_CRITERIA).toEqual([
    'totalMassKg',
    'fepAreaM2',
    'powerToMassWPerKg',
  ]);
  expect(PARETO_METRIC_SENSE.totalMassKg).toBe('minimize');
  expect(PARETO_METRIC_SENSE.fepAreaM2).toBe('minimize');
  expect(PARETO_METRIC_SENSE.powerToMassWPerKg).toBe('maximize');
  expect(CONSTRAINT_VIOLATION_ORDER).toEqual([
    'power',
    'mass',
    'area',
    'altitude',
    'concentration',
    'structure-concentration',
  ]);

  const cell: PhotovoltaicCell = {
    id: 'user-fep',
    name: 'User FEP',
    efficiency: 0.3,
  };
  const material: ConcentratorMaterial = {
    id: 'bk7',
    name: 'BK7',
    densityGPerCm3: 2.5,
  };
  const input: SepCalculationInput = {
    altitudeKm: 1200,
    maxMassKg: 100,
    requiredPowerW: 2500,
    maxPanelAreaM2: 5,
    panelCount: 2,
    photovoltaicCells: [cell],
    structures: ['honeycomb', 'frame'],
    concentratorMaterials: [material],
    paretoCriteria: DEFAULT_PARETO_CRITERIA,
  };
  const solution: SepSolution = {
    id: JSON.stringify(['user-fep', 'honeycomb', null, 1200, 1, 1]),
    photovoltaicCellId: cell.id,
    photovoltaicCellName: cell.name,
    fepEfficiency: cell.efficiency,
    structureType: 'honeycomb',
    concentratorMaterialId: null,
    concentratorMaterialName: null,
    altitudeKm: input.altitudeKm,
    concentration: 1,
    averageCosine: 0.7,
    sepAreaM2: 0.1,
    fepAreaM2: 0.1,
    averagePowerW: 2500,
    structureMassKg: 0.163,
    concentratorMassKg: 0,
    totalMassKg: 0.163,
    specificMassKgPerM2: 1.63,
    powerToMassWPerKg: 2500 / 0.163,
    powerMarginW: 0,
    massMarginKg: 99.837,
    areaMarginM2: 9.9,
    isPareto: true,
  };
  const result: SepCalculationResult = {
    solutions: [solution],
    totalGenerated: 1,
    totalFeasible: 1,
  };
  const params: ConstraintParams = {
    averagePowerW: solution.averagePowerW,
    requiredPowerW: input.requiredPowerW,
    totalMassKg: solution.totalMassKg,
    maxMassKg: input.maxMassKg,
    sepAreaM2: solution.sepAreaM2,
    maxSepAreaM2: input.maxPanelAreaM2 * input.panelCount,
    altitudeKm: input.altitudeKm,
    concentration: solution.concentration,
    structureType: solution.structureType,
  };
  const evaluation: ConstraintEvaluation = {
    isFeasible: true,
    violations: [],
    powerMarginW: solution.powerMarginW,
    massMarginKg: solution.massMarginKg,
    areaMarginM2: solution.areaMarginM2,
  };

  expect(result.totalFeasible).toBe(result.solutions.length);
  expect(params.maxSepAreaM2).toBe(10);
  expect(evaluation.isFeasible).toBe(true);
  expect(new SepCalculationError('invalid input').name).toBe('SepCalculationError');

  const constraintsApi: ConstraintsApi = {
    evaluateConstraints: () => evaluation,
    isStructurallyFeasible: () => true,
    maxConcentrationForStructure: (structureType) =>
      STRUCTURE_MAX_CONCENTRATION[structureType],
  };
  expect(constraintsApi.maxConcentrationForStructure('honeycomb')).toBe(2.3);
});

test('@sep/core stays free of CSV parsing, File API and React', () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...pkg.devDependencies,
  };

  expect(pkg.dependencies ?? {}).toEqual({});
  expect(allDeps.papaparse).toBeUndefined();
  expect(allDeps.react).toBeUndefined();
  expect(allDeps['react-dom']).toBeUndefined();

  const indexSource = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  expect(indexSource).not.toMatch(/papaparse|Papa\.parse|FileReader|from ['"]react['"]/);
});

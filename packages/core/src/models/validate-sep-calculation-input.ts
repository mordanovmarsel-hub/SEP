import {
  MAX_ALTITUDE_KM,
  MAX_FEP_EFFICIENCY,
  MIN_ALTITUDE_KM,
  MIN_FEP_EFFICIENCY_EXCLUSIVE,
} from './constants';
import { SepCalculationError } from './errors';
import {
  DEFAULT_PARETO_CRITERIA,
  type ConcentratorMaterial,
  type ParetoMetric,
  type PhotovoltaicCell,
  type SepCalculationInput,
  type StructureType,
} from './types';

const STRUCTURE_TYPES = new Set<StructureType>(['honeycomb', 'frame']);
const KNOWN_PARETO_METRICS = new Set<string>(DEFAULT_PARETO_CRITERIA);

function requireFiniteNumber(value: number, label: string, constraint: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SepCalculationError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function requireGreaterThanZero(value: number, label: string): void {
  const constraint = 'greater than 0';
  requireFiniteNumber(value, label, constraint);
  if (value <= 0) {
    throw new SepCalculationError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function requireFiniteInRange(
  value: number,
  label: string,
  min: number,
  max: number,
  minExclusive = false,
): void {
  const left = minExclusive ? '(' : '[';
  const constraint = `in ${left}${min}, ${max}]`;
  requireFiniteNumber(value, label, constraint);

  const belowMin = minExclusive ? value <= min : value < min;
  if (belowMin || value > max) {
    throw new SepCalculationError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function requirePositiveInteger(value: number, label: string): void {
  const constraint = 'a positive integer';
  requireFiniteNumber(value, label, constraint);
  if (!Number.isInteger(value) || value <= 0) {
    throw new SepCalculationError(
      `Invalid ${label}: expected ${constraint}, received ${String(value)}`,
    );
  }
}

function requireNonEmptyString(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SepCalculationError(
      `Invalid ${label}: expected a non-empty string, received ${String(value)}`,
    );
  }
}

function requireUniqueIds(ids: readonly string[], label: string): void {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      throw new SepCalculationError(`Invalid ${label}: duplicate id '${id}'`);
    }
    seen.add(id);
  }
}

function requirePhotovoltaicCell(cell: PhotovoltaicCell, index: number): void {
  if (cell === null || typeof cell !== 'object') {
    throw new SepCalculationError(
      `Invalid photovoltaicCells[${String(index)}]: expected an object, received ${String(cell)}`,
    );
  }

  requireNonEmptyString(cell.id, `photovoltaicCells[${String(index)}].id`);
  requireNonEmptyString(cell.name, `photovoltaicCells[${String(index)}].name`);
  requireFiniteInRange(
    cell.efficiency,
    `photovoltaicCells[${String(index)}].efficiency`,
    MIN_FEP_EFFICIENCY_EXCLUSIVE,
    MAX_FEP_EFFICIENCY,
    true,
  );
}

function requireConcentratorMaterial(material: ConcentratorMaterial, index: number): void {
  if (material === null || typeof material !== 'object') {
    throw new SepCalculationError(
      `Invalid concentratorMaterials[${String(index)}]: expected an object, received ${String(material)}`,
    );
  }

  requireNonEmptyString(material.id, `concentratorMaterials[${String(index)}].id`);
  requireNonEmptyString(material.name, `concentratorMaterials[${String(index)}].name`);
  requireGreaterThanZero(
    material.densityGPerCm3,
    `concentratorMaterials[${String(index)}].densityGPerCm3`,
  );
}

function requireStructureType(value: StructureType, index: number): void {
  if (typeof value !== 'string' || !STRUCTURE_TYPES.has(value)) {
    throw new SepCalculationError(
      `Invalid structures[${String(index)}]: expected 'honeycomb' or 'frame', received ${String(value)}`,
    );
  }
}

function requireParetoCriteria(criteria: readonly ParetoMetric[]): void {
  if (!Array.isArray(criteria)) {
    throw new SepCalculationError(
      `Invalid paretoCriteria: expected an array of known metrics, received ${String(criteria)}`,
    );
  }

  if (criteria.length === 0) {
    throw new SepCalculationError(
      'Invalid paretoCriteria: expected a non-empty array of known metrics, or omit the field for the default trio',
    );
  }

  criteria.forEach((metric, index) => {
    if (!KNOWN_PARETO_METRICS.has(metric)) {
      throw new SepCalculationError(
        `Invalid paretoCriteria[${String(index)}]: unknown metric '${String(metric)}'`,
      );
    }
  });

  requireUniqueIds(criteria, 'paretoCriteria');
}

/**
 * Validates top-level `calculateSep` input. Throws {@link SepCalculationError}.
 * Does not clamp or silently correct values.
 * An empty `concentratorMaterials` list is valid: K=1 remains possible.
 */
export function validateSepCalculationInput(input: SepCalculationInput): void {
  if (input === null || typeof input !== 'object') {
    throw new SepCalculationError(
      `Invalid input: expected an object, received ${String(input)}`,
    );
  }

  requireFiniteInRange(input.altitudeKm, 'altitudeKm', MIN_ALTITUDE_KM, MAX_ALTITUDE_KM);
  requireGreaterThanZero(input.maxMassKg, 'maxMassKg');
  requireGreaterThanZero(input.requiredPowerW, 'requiredPowerW');
  requireGreaterThanZero(input.maxPanelAreaM2, 'maxPanelAreaM2');
  requirePositiveInteger(input.panelCount, 'panelCount');

  if (!Array.isArray(input.photovoltaicCells) || input.photovoltaicCells.length === 0) {
    throw new SepCalculationError(
      'Invalid photovoltaicCells: expected a non-empty array',
    );
  }

  input.photovoltaicCells.forEach(requirePhotovoltaicCell);
  requireUniqueIds(
    input.photovoltaicCells.map((cell) => cell.id),
    'photovoltaicCells',
  );

  if (!Array.isArray(input.structures) || input.structures.length === 0) {
    throw new SepCalculationError('Invalid structures: expected a non-empty array');
  }

  input.structures.forEach(requireStructureType);
  requireUniqueIds(input.structures, 'structures');

  if (input.paretoCriteria !== undefined) {
    requireParetoCriteria(input.paretoCriteria);
  }

  if (!Array.isArray(input.concentratorMaterials)) {
    throw new SepCalculationError(
      `Invalid concentratorMaterials: expected an array, received ${String(input.concentratorMaterials)}`,
    );
  }

  input.concentratorMaterials.forEach(requireConcentratorMaterial);
  requireUniqueIds(
    input.concentratorMaterials.map((material) => material.id),
    'concentratorMaterials',
  );
}

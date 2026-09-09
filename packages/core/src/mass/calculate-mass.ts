import type { StructureType } from '../models/types';

export type { StructureType };

export interface MassParams {
  sepAreaM2: number;
  concentration: number;
  structureType: StructureType;
  concentratorDensityGPerCm3?: number | null;
}

export interface MassResult {
  structureMassKg: number;
  concentratorMassKg: number;
  totalMassKg: number;
}

export class MassCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MassCalculationError';
  }
}

const MIN_CONCENTRATION = 1;
const MAX_CONCENTRATION = 9;
const STRUCTURE_SPECIFIC_MASS_KG_PER_M2 = {
  honeycomb: 1.63,
  frame: 1.69,
} as const;
const STRUCTURE_TYPES = new Set<string>(Object.keys(STRUCTURE_SPECIFIC_MASS_KG_PER_M2));

function requireFiniteNumber(value: number, label: string, constraint: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new MassCalculationError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function requireGreaterThanZero(value: number, label: string): void {
  const constraint = 'greater than 0';
  requireFiniteNumber(value, label, constraint);
  if (value <= 0) {
    throw new MassCalculationError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function requireFiniteInRange(
  value: number,
  label: string,
  min: number,
  max: number,
): void {
  const constraint = `in [${min}, ${max}]`;
  requireFiniteNumber(value, label, constraint);

  if (value < min || value > max) {
    throw new MassCalculationError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function requireStructureType(value: StructureType): asserts value is StructureType {
  if (typeof value !== 'string' || !STRUCTURE_TYPES.has(value)) {
    throw new MassCalculationError(
      `Invalid structureType: expected 'honeycomb' or 'frame', received ${String(value)}`,
    );
  }
}

function structureSpecificMass(structureType: StructureType): number {
  return STRUCTURE_SPECIFIC_MASS_KG_PER_M2[structureType];
}

function concentratorSpecificMass(densityGPerCm3: number): number {
  return 2 * densityGPerCm3;
}

function requireAbsentDensity(value: number | null | undefined): void {
  if (value !== undefined && value !== null) {
    throw new MassCalculationError(
      `Invalid concentratorDensityGPerCm3: expected undefined or null when concentration is 1, received ${String(value)}`,
    );
  }
}

function requirePositiveDensity(value: number | null | undefined): number {
  if (typeof value !== 'number') {
    throw new MassCalculationError(
      `Invalid concentratorDensityGPerCm3: expected a finite number greater than 0, received ${String(value)}`,
    );
  }

  requireGreaterThanZero(value, 'concentratorDensityGPerCm3');
  return value;
}

/**
 * Mass of one SEP configuration from the approved model v1:
 * M_structure = sigma_structure * S_SEP;
 * M_concentrator = 0 when K = 1, otherwise 2 * rho * S_SEP.
 */
export function calculateMass({
  sepAreaM2,
  concentration,
  structureType,
  concentratorDensityGPerCm3,
}: MassParams): MassResult {
  requireGreaterThanZero(sepAreaM2, 'sepAreaM2');
  requireFiniteInRange(concentration, 'concentration', MIN_CONCENTRATION, MAX_CONCENTRATION);
  requireStructureType(structureType);

  const structureMassKg = structureSpecificMass(structureType) * sepAreaM2;

  if (concentration === 1) {
    requireAbsentDensity(concentratorDensityGPerCm3);
    return {
      structureMassKg,
      concentratorMassKg: 0,
      totalMassKg: structureMassKg,
    };
  }

  const densityGPerCm3 = requirePositiveDensity(concentratorDensityGPerCm3);
  const concentratorMassKg = concentratorSpecificMass(densityGPerCm3) * sepAreaM2;

  return {
    structureMassKg,
    concentratorMassKg,
    totalMassKg: structureMassKg + concentratorMassKg,
  };
}

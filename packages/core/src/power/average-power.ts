export interface AveragePowerParams {
  sepAreaM2: number;
  fepEfficiency: number;
  concentration: number;
  averageCosine: number;
}

export class AveragePowerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AveragePowerError';
  }
}

const SOLAR_IRRADIANCE_W_PER_M2 = 1361;
const MIN_CONCENTRATION = 1;
const MAX_CONCENTRATION = 9;
const ETA_OPT_NO_CONCENTRATOR = 1;
const ETA_OPT_WITH_CONCENTRATOR = 0.99;

function requireFiniteNumber(value: number, label: string, constraint: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AveragePowerError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function requireGreaterThanZero(value: number, label: string): void {
  const constraint = 'greater than 0';
  requireFiniteNumber(value, label, constraint);
  if (value <= 0) {
    throw new AveragePowerError(
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
    throw new AveragePowerError(
      `Invalid ${label}: expected a finite number ${constraint}, received ${String(value)}`,
    );
  }
}

function opticalEfficiency(concentration: number): number {
  return concentration === 1 ? ETA_OPT_NO_CONCENTRATOR : ETA_OPT_WITH_CONCENTRATOR;
}

/**
 * Average electrical power of one SEP configuration from the approved
 * base model v1: P_avg = q_sol * S_SEP * eta_FEP_ref * eta_opt(K) * cos(alpha).
 */
export function calculateAveragePower({
  sepAreaM2,
  fepEfficiency,
  concentration,
  averageCosine,
}: AveragePowerParams): number {
  requireGreaterThanZero(sepAreaM2, 'sepAreaM2');
  requireFiniteInRange(fepEfficiency, 'fepEfficiency', 0, 1, true);
  requireFiniteInRange(concentration, 'concentration', MIN_CONCENTRATION, MAX_CONCENTRATION);
  requireFiniteInRange(averageCosine, 'averageCosine', 0, 1);

  return (
    SOLAR_IRRADIANCE_W_PER_M2 *
    sepAreaM2 *
    fepEfficiency *
    opticalEfficiency(concentration) *
    averageCosine
  );
}

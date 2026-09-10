/**
 * Bearing structure of the SEP panel.
 * Constructive K limits live in constraints, not in the mass model.
 */
export type StructureType = 'honeycomb' | 'frame';

/**
 * User-defined photovoltaic cell for the CONSTANT efficiency model.
 * `efficiency` is a fraction (0.30 = 30%). Do not invent catalogue FEP values.
 */
export interface PhotovoltaicCell {
  id: string;
  name: string;
  efficiency: number;
}

export interface ConcentratorMaterial {
  id: string;
  name: string;
  densityGPerCm3: number;
}

export type ParetoMetric =
  | 'totalMassKg'
  | 'fepAreaM2'
  | 'powerToMassWPerKg';

export type ParetoSense = 'minimize' | 'maximize';

export const PARETO_METRIC_SENSE = {
  totalMassKg: 'minimize',
  fepAreaM2: 'minimize',
  powerToMassWPerKg: 'maximize',
} as const satisfies Record<ParetoMetric, ParetoSense>;

export const DEFAULT_PARETO_CRITERIA = [
  'totalMassKg',
  'fepAreaM2',
  'powerToMassWPerKg',
] as const satisfies readonly ParetoMetric[];

/**
 * Top-level calculation input. `S_max = maxPanelAreaM2 * panelCount`.
 * Core must not mutate the input arrays.
 */
export interface SepCalculationInput {
  altitudeKm: number;
  maxMassKg: number;
  requiredPowerW: number;
  maxPanelAreaM2: number;
  panelCount: number;
  photovoltaicCells: readonly PhotovoltaicCell[];
  structures: readonly StructureType[];
  concentratorMaterials: readonly ConcentratorMaterial[];
  paretoCriteria?: readonly ParetoMetric[];
}

/**
 * One feasible configuration. `id` is a deterministic JSON-array encoding of
 * FEP + structure + material/null + H + K + integer area tick — never random.
 *
 * derived:
 * - fepAreaM2 = sepAreaM2 / concentration
 * - specificMassKgPerM2 = totalMassKg / sepAreaM2
 * - powerToMassWPerKg = averagePowerW / totalMassKg
 */
export interface SepSolution {
  id: string;

  photovoltaicCellId: string;
  photovoltaicCellName: string;
  fepEfficiency: number;

  structureType: StructureType;

  concentratorMaterialId: string | null;
  concentratorMaterialName: string | null;

  altitudeKm: number;
  concentration: number;
  averageCosine: number;

  sepAreaM2: number;
  fepAreaM2: number;

  averagePowerW: number;

  structureMassKg: number;
  concentratorMassKg: number;
  totalMassKg: number;

  specificMassKgPerM2: number;
  powerToMassWPerKg: number;

  powerMarginW: number;
  massMarginKg: number;
  areaMarginM2: number;

  isPareto: boolean;
}

/**
 * Result of `calculateSep(input)`.
 *
 * `totalGenerated` counts numeric candidate configurations that reached
 * physical evaluation after structurally impossible K values were dropped.
 * Honeycomb K=3..9 are not generated. K=1 is counted once regardless of
 * how many concentrator materials were supplied.
 *
 * Guarantee: `totalFeasible === solutions.length`.
 */
export interface SepCalculationResult {
  solutions: SepSolution[];
  totalGenerated: number;
  totalFeasible: number;
}

/**
 * Canonical top-level API. v1 always uses EFFICIENCY_MODEL = CONSTANT.
 */
export type CalculateSep = (input: SepCalculationInput) => SepCalculationResult;

/**
 * Input validation for `calculateSep`. Throws {@link SepCalculationError}.
 * No clamp and no silent correction.
 */
export type ValidateSepCalculationInput = (input: SepCalculationInput) => void;

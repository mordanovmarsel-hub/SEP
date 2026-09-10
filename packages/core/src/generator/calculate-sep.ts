import { calculateAverageCosine } from '../cosine';
import { evaluateConstraints, isStructurallyFeasible } from '../constraints';
import { calculateMass } from '../mass';
import {
  GENERATOR_CONCENTRATIONS,
  SEP_AREA_STEP_M2,
  SepCalculationError,
  validateSepCalculationInput,
} from '../models';
import type {
  ConcentratorMaterial,
  PhotovoltaicCell,
  SepCalculationInput,
  SepCalculationResult,
  SepSolution,
  StructureType,
} from '../models';
import { ParetoError, markParetoSolutions } from '../pareto';
import { calculateAveragePower } from '../power';

/** Integer ticks per m² so `sepAreaM2 = tick / SEP_AREA_TICKS_PER_M2`. */
const SEP_AREA_TICKS_PER_M2 = Math.round(1 / SEP_AREA_STEP_M2);

/**
 * Treat `S_max * 10` as an integer tick count when IEEE rounding left it
 * within this epsilon of a whole number (e.g. `0.3 * 3 → 8.999… → 9`).
 * ~1e-15 is typical product noise; 1e-12 on the scaled tick must not round
 * `S_max = 0.9 - 5e-11` up to 0.9.
 */
const AREA_TICK_INTEGER_EPS = 1e-12;

/**
 * Maximum number of 0.1 m² area ticks the generator will enumerate.
 * `1_000_000` ticks means `S_max = 100_000` m²; that value and anything
 * larger is unphysical for v1 and would freeze the UI. Hard reject at
 * equality (`maxTick >= MAX_AREA_TICK_COUNT`), not a silent truncate.
 * `S_max = 99999.9` (999_999 ticks) stays below the cap.
 */
export const MAX_AREA_TICK_COUNT = 1_000_000;

interface AreaTick {
  tick: number;
  sepAreaM2: number;
}

interface CandidateContext {
  input: SepCalculationInput;
  cell: PhotovoltaicCell;
  structureType: StructureType;
  material: ConcentratorMaterial | null;
  concentration: number;
  averageCosine: number;
  area: AreaTick;
  maxSepAreaM2: number;
}

/**
 * Last included integer tick for `S_max`.
 * Near-integer `S_max * 10` snaps to that integer so `0.3 * 3` yields 9.
 * Otherwise `Math.floor`, so `0.25` stays at tick 2 and does not become 0.3.
 */
export function maxAreaTickCount(maxSepAreaM2: number): number {
  const scaled = maxSepAreaM2 * SEP_AREA_TICKS_PER_M2;
  const nearest = Math.round(scaled);
  if (Math.abs(scaled - nearest) <= AREA_TICK_INTEGER_EPS) {
    return nearest;
  }
  return Math.floor(scaled);
}

/**
 * `S_max` used for constraints/margins. When the raw product is within
 * {@link AREA_TICK_INTEGER_EPS} of an integer tick, use that tick / 10
 * so `0.3 * 3` is treated as `0.9` (last step included and feasible).
 * Non-grid values such as `0.25` stay unchanged.
 */
export function effectiveMaxSepAreaM2(maxSepAreaM2: number): number {
  const scaled = maxSepAreaM2 * SEP_AREA_TICKS_PER_M2;
  const nearest = Math.round(scaled);
  if (Math.abs(scaled - nearest) <= AREA_TICK_INTEGER_EPS) {
    return nearest / SEP_AREA_TICKS_PER_M2;
  }
  return maxSepAreaM2;
}

/**
 * Area ticks `1 .. maxTick` from an integer bound.
 * Never increments a float area, never compares `tick / 10` to a float
 * product, and never rounds a non-near-integer `S_max` up.
 * `S_max < 0.1` yields an empty list.
 */
function enumerateAreaTicks(maxSepAreaM2: number): AreaTick[] {
  const maxTick = maxAreaTickCount(maxSepAreaM2);
  const ticks: AreaTick[] = [];

  for (let tick = 1; tick <= maxTick; tick += 1) {
    ticks.push({
      tick,
      sepAreaM2: tick / SEP_AREA_TICKS_PER_M2,
    });
  }

  return ticks;
}

/**
 * Deterministic id from FEP, structure, material/null, H, K and the
 * integer area tick (tenths of m²) so `0.1` and `0.10` collide.
 * Encoded as a JSON array so `|` inside an id cannot smash fields together.
 */
function buildSolutionId(
  cellId: string,
  structureType: StructureType,
  materialId: string | null,
  altitudeKm: number,
  concentration: number,
  areaTick: number,
): string {
  return JSON.stringify([
    cellId,
    structureType,
    materialId,
    altitudeKm,
    concentration,
    areaTick,
  ]);
}

function evaluateCandidate(context: CandidateContext): SepSolution | null {
  const {
    input,
    cell,
    structureType,
    material,
    concentration,
    averageCosine,
    area,
    maxSepAreaM2,
  } = context;

  const sepAreaM2 = area.sepAreaM2;
  const fepAreaM2 = sepAreaM2 / concentration;

  const averagePowerW = calculateAveragePower({
    sepAreaM2,
    fepEfficiency: cell.efficiency,
    concentration,
    averageCosine,
  });

  const mass =
    concentration === 1
      ? calculateMass({
          sepAreaM2,
          concentration,
          structureType,
        })
      : calculateMass({
          sepAreaM2,
          concentration,
          structureType,
          concentratorDensityGPerCm3: material?.densityGPerCm3,
        });

  const constraints = evaluateConstraints({
    averagePowerW,
    requiredPowerW: input.requiredPowerW,
    totalMassKg: mass.totalMassKg,
    maxMassKg: input.maxMassKg,
    sepAreaM2,
    maxSepAreaM2,
    altitudeKm: input.altitudeKm,
    concentration,
    structureType,
  });

  if (!constraints.isFeasible) {
    return null;
  }

  return {
    id: buildSolutionId(
      cell.id,
      structureType,
      material?.id ?? null,
      input.altitudeKm,
      concentration,
      area.tick,
    ),
    photovoltaicCellId: cell.id,
    photovoltaicCellName: cell.name,
    fepEfficiency: cell.efficiency,
    structureType,
    concentratorMaterialId: material?.id ?? null,
    concentratorMaterialName: material?.name ?? null,
    altitudeKm: input.altitudeKm,
    concentration,
    averageCosine,
    sepAreaM2,
    fepAreaM2,
    averagePowerW,
    structureMassKg: mass.structureMassKg,
    concentratorMassKg: mass.concentratorMassKg,
    totalMassKg: mass.totalMassKg,
    specificMassKgPerM2: mass.totalMassKg / sepAreaM2,
    powerToMassWPerKg: averagePowerW / mass.totalMassKg,
    powerMarginW: constraints.powerMarginW,
    massMarginKg: constraints.massMarginKg,
    areaMarginM2: constraints.areaMarginM2,
    isPareto: false,
  };
}

/**
 * Full combinatorial search of feasible SEP configurations.
 *
 * Loop order (and therefore output order): FEP → structure → K → material → area.
 *
 * `totalGenerated` is the number of numeric candidate configurations that
 * actually reached physical calculation after structurally impossible K
 * values were dropped:
 * - honeycomb K=3..9 are not generated and are not counted;
 * - K=1 is counted once regardless of how many concentrator materials
 *   were supplied, and is still generated when the materials list is empty;
 * - K>1 with an empty materials list produce zero candidates.
 *
 * Guarantee: `totalFeasible === solutions.length`.
 * v1 always uses `EFFICIENCY_MODEL = CONSTANT`.
 */
export function calculateSep(input: SepCalculationInput): SepCalculationResult {
  validateSepCalculationInput(input);

  const rawMaxSepAreaM2 = input.maxPanelAreaM2 * input.panelCount;
  if (!Number.isFinite(rawMaxSepAreaM2)) {
    throw new SepCalculationError(
      `Invalid S_max: maxPanelAreaM2 * panelCount overflowed to ${String(rawMaxSepAreaM2)}`,
    );
  }

  const maxTick = maxAreaTickCount(rawMaxSepAreaM2);
  if (maxTick >= MAX_AREA_TICK_COUNT) {
    throw new SepCalculationError(
      `Invalid S_max: area tick count ${String(maxTick)} exceeds the ${String(MAX_AREA_TICK_COUNT)} cap (S_max >= 100000 m²)`,
    );
  }

  const maxSepAreaM2 = effectiveMaxSepAreaM2(rawMaxSepAreaM2);
  const areaTicks = enumerateAreaTicks(rawMaxSepAreaM2);
  const feasible: SepSolution[] = [];
  let totalGenerated = 0;

  for (const cell of input.photovoltaicCells) {
    for (const structureType of input.structures) {
      for (const concentration of GENERATOR_CONCENTRATIONS) {
        if (!isStructurallyFeasible(structureType, concentration)) {
          continue;
        }

        const averageCosine = calculateAverageCosine({
          altitudeKm: input.altitudeKm,
          concentration,
        });

        if (concentration === 1) {
          for (const area of areaTicks) {
            totalGenerated += 1;
            const solution = evaluateCandidate({
              input,
              cell,
              structureType,
              material: null,
              concentration,
              averageCosine,
              area,
              maxSepAreaM2,
            });
            if (solution !== null) {
              feasible.push(solution);
            }
          }
          continue;
        }

        for (const material of input.concentratorMaterials) {
          for (const area of areaTicks) {
            totalGenerated += 1;
            const solution = evaluateCandidate({
              input,
              cell,
              structureType,
              material,
              concentration,
              averageCosine,
              area,
              maxSepAreaM2,
            });
            if (solution !== null) {
              feasible.push(solution);
            }
          }
        }
      }
    }
  }

  let solutions: SepSolution[];
  try {
    solutions = markParetoSolutions(feasible, input.paretoCriteria);
  } catch (error) {
    if (error instanceof ParetoError) {
      throw new SepCalculationError(error.message);
    }
    throw error;
  }

  return {
    solutions,
    totalGenerated,
    totalFeasible: solutions.length,
  };
}

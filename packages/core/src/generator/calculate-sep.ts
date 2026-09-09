import { calculateAverageCosine } from '../cosine';
import { evaluateConstraints, isStructurallyFeasible } from '../constraints';
import { calculateMass } from '../mass';
import {
  GENERATOR_CONCENTRATIONS,
  SEP_AREA_STEP_M2,
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
import { markParetoSolutions } from '../pareto';
import { calculateAveragePower } from '../power';

/** Integer ticks per m² so `sepAreaM2 = tick / SEP_AREA_TICKS_PER_M2`. */
const SEP_AREA_TICKS_PER_M2 = Math.round(1 / SEP_AREA_STEP_M2);

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
 * Area ticks `1, 2, …` while `tick / 10 <= S_max`.
 * Never increments a float area and never rounds `S_max` up.
 * `S_max < 0.1` yields an empty list.
 */
function enumerateAreaTicks(maxSepAreaM2: number): AreaTick[] {
  const ticks: AreaTick[] = [];

  for (
    let tick = 1;
    tick / SEP_AREA_TICKS_PER_M2 <= maxSepAreaM2;
    tick += 1
  ) {
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
 */
function buildSolutionId(
  cellId: string,
  structureType: StructureType,
  materialId: string | null,
  altitudeKm: number,
  concentration: number,
  areaTick: number,
): string {
  return [
    cellId,
    structureType,
    materialId ?? 'null',
    String(altitudeKm),
    String(concentration),
    String(areaTick),
  ].join('|');
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

  const maxSepAreaM2 = input.maxPanelAreaM2 * input.panelCount;
  const areaTicks = enumerateAreaTicks(maxSepAreaM2);
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

  const solutions = markParetoSolutions(feasible, input.paretoCriteria);

  return {
    solutions,
    totalGenerated,
    totalFeasible: solutions.length,
  };
}

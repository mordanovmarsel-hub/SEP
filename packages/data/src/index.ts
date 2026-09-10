/**
 * Reference data for SEP v1. FEP catalogues are intentionally absent:
 * the user supplies photovoltaic cells; this package must not invent them.
 */
export {
  CONCENTRATOR_MATERIALS,
  CONCENTRATOR_MATERIALS_BY_ID,
} from './concentrator-materials';
export type { ApprovedConcentratorMaterialId } from './concentrator-materials';

export { STRUCTURES, STRUCTURE_LABELS } from './structures';
export type { StructurePresentation } from './structures';

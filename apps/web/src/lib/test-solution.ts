import type { SepSolution } from '@sep/core';

export function testSolution(
  overrides: Partial<SepSolution> & Pick<SepSolution, 'id'>,
): SepSolution {
  return {
    photovoltaicCellId: 'fep-1',
    photovoltaicCellName: 'ФЭП 1',
    fepEfficiency: 0.3,
    structureType: 'frame',
    concentratorMaterialId: 'bk7',
    concentratorMaterialName: 'BK7',
    altitudeKm: 800,
    concentration: 2,
    averageCosine: 0.65,
    sepAreaM2: 0.2,
    fepAreaM2: 0.1,
    averagePowerW: 50,
    structureMassKg: 0.3,
    concentratorMassKg: 0.2,
    totalMassKg: 0.5,
    specificMassKgPerM2: 2.5,
    powerToMassWPerKg: 100,
    powerMarginW: 10,
    massMarginKg: 5,
    areaMarginM2: 0.1,
    isPareto: false,
    ...overrides,
  };
}

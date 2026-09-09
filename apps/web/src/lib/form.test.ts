import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FORM,
  FormValidationError,
  buildCalculationInput,
  createFepDraft,
} from './form.ts';

describe('buildCalculationInput', () => {
  it('converts efficiency percent to a core fraction', () => {
    const input = buildCalculationInput(DEFAULT_FORM);
    expect(input.photovoltaicCells).toEqual([
      { id: 'fep-1', name: 'ФЭП 1', efficiency: 0.3 },
    ]);
  });

  it('keeps selected approved materials and both structures', () => {
    const input = buildCalculationInput(DEFAULT_FORM);
    expect(input.structures).toEqual(['honeycomb', 'frame']);
    expect(input.concentratorMaterials.map((material) => material.id)).toEqual([
      'caf2',
      'mgf2',
      'bk7',
      'synthetic-uv-glass',
      'quartz-glass',
    ]);
  });

  it('rejects altitude outside 400–3600 without calling core', () => {
    expect(() =>
      buildCalculationInput({ ...DEFAULT_FORM, altitudeKm: '100' }),
    ).toThrow(FormValidationError);
    expect(() =>
      buildCalculationInput({ ...DEFAULT_FORM, altitudeKm: '100' }),
    ).toThrow(/400 до 3600/);
  });

  it('rejects empty FEP name and out-of-range percent', () => {
    expect(() =>
      buildCalculationInput({
        ...DEFAULT_FORM,
        feps: [{ id: 'fep-1', name: '   ', efficiencyPercent: '30' }],
      }),
    ).toThrow(/Название ФЭП/);

    expect(() =>
      buildCalculationInput({
        ...DEFAULT_FORM,
        feps: [{ id: 'fep-1', name: 'ФЭП 1', efficiencyPercent: '0' }],
      }),
    ).toThrow(/процентах/);
  });

  it('allows an empty material list so K=1 remains possible', () => {
    const input = buildCalculationInput({
      ...DEFAULT_FORM,
      selectedMaterialIds: [],
    });
    expect(input.concentratorMaterials).toEqual([]);
  });

  it('allocates unique editable FEP ids', () => {
    const first = createFepDraft([]);
    const second = createFepDraft([first]);
    expect(first.id).toBe('fep-1');
    expect(second.id).toBe('fep-2');
    expect(second.name).toBe('ФЭП 2');
  });
});

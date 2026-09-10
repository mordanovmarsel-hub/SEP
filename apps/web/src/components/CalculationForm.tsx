import { CONCENTRATOR_MATERIALS, STRUCTURES } from '@sep/data';
import type { StructureType } from '@sep/core';
import { FepEditor } from './FepEditor.tsx';
import type { CalculationFormValues } from '../lib/form.ts';

interface CalculationFormProps {
  value: CalculationFormValues;
  onChange: (value: CalculationFormValues) => void;
  onSubmit: () => void;
}

function toggleValue<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export function CalculationForm({ value, onChange, onSubmit }: CalculationFormProps) {
  function patch(partial: Partial<CalculationFormValues>): void {
    onChange({ ...value, ...partial });
  }

  return (
    <form
      className="calculation-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset className="panel">
        <legend>Ограничения</legend>
        <div className="field-grid">
          <label>
            Высота орбиты, км
            <input
              id="altitudeKm"
              name="altitudeKm"
              type="number"
              min={400}
              max={3600}
              step="any"
              value={value.altitudeKm}
              onChange={(event) => patch({ altitudeKm: event.target.value })}
            />
          </label>
          <label>
            Максимальная масса СЭП, кг
            <input
              id="maxMassKg"
              name="maxMassKg"
              type="number"
              min={0}
              step="any"
              value={value.maxMassKg}
              onChange={(event) => patch({ maxMassKg: event.target.value })}
            />
          </label>
          <label>
            Требуемая средняя мощность, Вт
            <input
              id="requiredPowerW"
              name="requiredPowerW"
              type="number"
              min={0}
              step="any"
              value={value.requiredPowerW}
              onChange={(event) => patch({ requiredPowerW: event.target.value })}
            />
          </label>
          <label>
            Максимальная площадь панели, м²
            <input
              id="maxPanelAreaM2"
              name="maxPanelAreaM2"
              type="number"
              min={0}
              step="any"
              value={value.maxPanelAreaM2}
              onChange={(event) => patch({ maxPanelAreaM2: event.target.value })}
            />
          </label>
          <label>
            Количество панелей
            <input
              id="panelCount"
              name="panelCount"
              type="number"
              min={1}
              step={1}
              value={value.panelCount}
              onChange={(event) => patch({ panelCount: event.target.value })}
            />
          </label>
        </div>
      </fieldset>

      <FepEditor feps={value.feps} onChange={(feps) => patch({ feps })} />

      <fieldset className="panel">
        <legend>Конструкции</legend>
        <div className="check-row">
          {STRUCTURES.map((structure) => (
            <label key={structure.type} className="check">
              <input
                type="checkbox"
                name="structures"
                value={structure.type}
                checked={value.selectedStructures.includes(structure.type)}
                onChange={() =>
                  patch({
                    selectedStructures: toggleValue<StructureType>(
                      value.selectedStructures,
                      structure.type,
                    ),
                  })
                }
              />
              {structure.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="panel">
        <legend>Материалы концентратора</legend>
        <p className="hint">
          При K=1 концентратора нет, материал в результатах всегда пустой. Можно не
          выбирать материалы — останутся только конфигурации без концентратора.
        </p>
        <div className="check-row wrap">
          {CONCENTRATOR_MATERIALS.map((material) => (
            <label key={material.id} className="check">
              <input
                type="checkbox"
                name="materials"
                value={material.id}
                checked={value.selectedMaterialIds.includes(material.id)}
                onChange={() =>
                  patch({
                    selectedMaterialIds: toggleValue(
                      value.selectedMaterialIds,
                      material.id,
                    ),
                  })
                }
              />
              {material.name}
              <span className="muted"> ({String(material.densityGPerCm3)} г/см³)</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="button-primary" data-testid="calculate-button">
        Рассчитать
      </button>
    </form>
  );
}

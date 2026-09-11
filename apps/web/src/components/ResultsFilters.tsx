import type { SepSolution, StructureType } from '@sep/core';
import type { ResultsFilter } from '../lib/filter.ts';
import { formatMaterialName, formatStructure } from '../lib/format.ts';

interface ResultsFiltersProps {
  solutions: readonly SepSolution[];
  value: ResultsFilter;
  onChange: (value: ResultsFilter) => void;
}

interface NamedOption<T> {
  value: T;
  label: string;
}

function uniqueBy<T>(items: readonly T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    const id = key(item);
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(item);
    }
  }
  return unique;
}

function toggleList<T>(list: readonly T[], item: T, equals: (left: T, right: T) => boolean): T[] {
  return list.some((value) => equals(value, item))
    ? list.filter((value) => !equals(value, item))
    : [...list, item];
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') {
    return undefined;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

export function ResultsFilters({ solutions, value, onChange }: ResultsFiltersProps) {
  const fepOptions = uniqueBy(
    solutions.map((solution) => ({
      value: solution.photovoltaicCellId,
      label: solution.photovoltaicCellName,
    })),
    (option) => option.value,
  );

  const structureOptions = uniqueBy(
    solutions.map((solution) => solution.structureType),
    (type) => type,
  ).map((type) => ({ value: type, label: formatStructure(type) }));

  const materialOptions: NamedOption<string | null>[] = uniqueBy(
    solutions.map((solution) => ({
      value: solution.concentratorMaterialId,
      label: formatMaterialName(
        solution.concentratorMaterialName,
        solution.concentration,
      ),
    })),
    (option) => option.value ?? '__none__',
  );

  const concentrationOptions = [...new Set(solutions.map((solution) => solution.concentration))].sort(
    (left, right) => left - right,
  );

  function patch(partial: Partial<ResultsFilter>): void {
    onChange({ ...value, ...partial });
  }

  return (
    <section className="panel" data-testid="results-filters" aria-label="Фильтры результатов">
      <h2>Фильтры</h2>
      <p className="hint">
        Фильтры применяются к уже рассчитанным решениям и не запускают перебор заново.
        Пустой набор флажков означает «все значения».
      </p>

      <div className="filter-grid">
        <fieldset>
          <legend>ФЭП</legend>
          <div className="check-row wrap">
            {fepOptions.map((option) => (
              <label key={option.value} className="check">
                <input
                  type="checkbox"
                  checked={value.fepIds.includes(option.value)}
                  onChange={() =>
                    patch({
                      fepIds: toggleList(value.fepIds, option.value, (left, right) => left === right),
                    })
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Конструкция</legend>
          <div className="check-row wrap">
            {structureOptions.map((option) => (
              <label key={option.value} className="check">
                <input
                  type="checkbox"
                  checked={value.structures.includes(option.value)}
                  onChange={() =>
                    patch({
                      structures: toggleList<StructureType>(
                        value.structures,
                        option.value,
                        (left, right) => left === right,
                      ),
                    })
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Материал концентратора</legend>
          <div className="check-row wrap">
            {materialOptions.map((option) => (
              <label key={option.value ?? '__none__'} className="check">
                <input
                  type="checkbox"
                  checked={value.materialIds.includes(option.value)}
                  onChange={() =>
                    patch({
                      materialIds: toggleList(
                        value.materialIds,
                        option.value,
                        (left, right) => left === right,
                      ),
                    })
                  }
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>K</legend>
          <div className="check-row wrap">
            {concentrationOptions.map((concentration) => (
              <label key={concentration} className="check">
                <input
                  type="checkbox"
                  checked={value.concentrations.includes(concentration)}
                  onChange={() =>
                    patch({
                      concentrations: toggleList(
                        value.concentrations,
                        concentration,
                        (left, right) => left === right,
                      ),
                    })
                  }
                />
                {concentration}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="check pareto-filter">
        <input
          type="checkbox"
          checked={value.paretoOnly}
          onChange={(event) => patch({ paretoOnly: event.target.checked })}
        />
        Только Парето
      </label>

      <div className="range-grid">
        <RangeField
          label="Мощность, Вт"
          minValue={value.powerMin}
          maxValue={value.powerMax}
          onMinChange={(powerMin) => patch({ powerMin })}
          onMaxChange={(powerMax) => patch({ powerMax })}
        />
        <RangeField
          label="Масса, кг"
          minValue={value.massMin}
          maxValue={value.massMax}
          onMinChange={(massMin) => patch({ massMin })}
          onMaxChange={(massMax) => patch({ massMax })}
        />
        <RangeField
          label="Площадь СЭП, м²"
          minValue={value.areaMin}
          maxValue={value.areaMax}
          onMinChange={(areaMin) => patch({ areaMin })}
          onMaxChange={(areaMax) => patch({ areaMax })}
        />
      </div>
    </section>
  );
}

interface RangeFieldProps {
  label: string;
  minValue: number | undefined;
  maxValue: number | undefined;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
}

function RangeField({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: RangeFieldProps) {
  return (
    <fieldset className="range-field">
      <legend>{label}</legend>
      <div className="range-inputs">
        <label>
          от
          <input
            type="number"
            step="any"
            value={minValue ?? ''}
            onChange={(event) => onMinChange(parseOptionalNumber(event.target.value))}
          />
        </label>
        <label>
          до
          <input
            type="number"
            step="any"
            value={maxValue ?? ''}
            onChange={(event) => onMaxChange(parseOptionalNumber(event.target.value))}
          />
        </label>
      </div>
    </fieldset>
  );
}

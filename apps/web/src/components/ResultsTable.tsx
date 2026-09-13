import { useEffect, useRef } from 'react';
import type { SepSolution } from '@sep/core';
import {
  formatAltitudeKm,
  formatAreaM2,
  formatConcentration,
  formatCosine,
  formatMassKg,
  formatMaterialName,
  formatPowerW,
  formatStructure,
  formatWPerKg,
} from '../lib/format.ts';
import { type SortKey, type SortState, toggleSort } from '../lib/sort.ts';

interface ResultsTableProps {
  solutions: readonly SepSolution[];
  sort: SortState;
  selectedId: string | null;
  onSortChange: (sort: SortState) => void;
  onSelect: (id: string) => void;
}

export function ResultsTable({
  solutions,
  sort,
  selectedId,
  onSortChange,
  onSelect,
}: ResultsTableProps) {
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedId]);

  return (
    <section className="panel" aria-label="Таблица результатов">
      <h2>Допустимые конфигурации</h2>
      <p className="hint">
        Числа округлены только для отображения. Парето-решения всегда сверху;
        выбранная сортировка применяется внутри групп. Строка связана с точкой
        графика по идентификатору решения.
      </p>
      <div className="table-scroll">
        <table className="results-table" data-testid="results-table">
          <thead>
            <tr>
              <th scope="col">ФЭП</th>
              <th scope="col">Конструкция</th>
              <th scope="col">Материал</th>
              <th scope="col">H</th>
              <SortHeader label="K" column="concentration" sort={sort} onSortChange={onSortChange} />
              <SortHeader label="S_SEP" column="sepAreaM2" sort={sort} onSortChange={onSortChange} />
              <SortHeader label="S_FEP" column="fepAreaM2" sort={sort} onSortChange={onSortChange} />
              <th scope="col">cos(alpha)</th>
              <SortHeader label="Power" column="averagePowerW" sort={sort} onSortChange={onSortChange} />
              <SortHeader label="Mass" column="totalMassKg" sort={sort} onSortChange={onSortChange} />
              <SortHeader label="W/kg" column="powerToMassWPerKg" sort={sort} onSortChange={onSortChange} />
              <SortHeader
                label="Power margin"
                column="powerMarginW"
                sort={sort}
                onSortChange={onSortChange}
              />
              <SortHeader
                label="Mass margin"
                column="massMarginKg"
                sort={sort}
                onSortChange={onSortChange}
              />
              <th scope="col">Парето</th>
            </tr>
          </thead>
          <tbody>
            {solutions.map((solution) => {
              const selected = solution.id === selectedId;
              return (
                <tr
                  key={solution.id}
                  id={`solution-${solution.id}`}
                  ref={selected ? selectedRowRef : undefined}
                  className={selected ? 'is-selected' : undefined}
                  onClick={() => onSelect(solution.id)}
                >
                  <td>{solution.photovoltaicCellName}</td>
                  <td>{formatStructure(solution.structureType)}</td>
                  <td>
                    {formatMaterialName(
                      solution.concentratorMaterialName,
                      solution.concentration,
                    )}
                  </td>
                  <td>{formatAltitudeKm(solution.altitudeKm)}</td>
                  <td>{formatConcentration(solution.concentration)}</td>
                  <td>{formatAreaM2(solution.sepAreaM2)}</td>
                  <td>{formatAreaM2(solution.fepAreaM2)}</td>
                  <td>{formatCosine(solution.averageCosine)}</td>
                  <td>{formatPowerW(solution.averagePowerW)}</td>
                  <td>{formatMassKg(solution.totalMassKg)}</td>
                  <td>{formatWPerKg(solution.powerToMassWPerKg)}</td>
                  <td>{formatPowerW(solution.powerMarginW)}</td>
                  <td>{formatMassKg(solution.massMarginKg)}</td>
                  <td>
                    {solution.isPareto ? (
                      <span className="pareto-badge" title="Парето-оптимальное решение">
                        ★ Парето
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface SortHeaderProps {
  label: string;
  column: SortKey;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

function SortHeader({ label, column, sort, onSortChange }: SortHeaderProps) {
  const active = sort.key === column;
  return (
    <th scope="col">
      <button
        type="button"
        className="sort-button"
        onClick={() => onSortChange(toggleSort(sort, column))}
        aria-pressed={active}
      >
        {label}
        {active ? (sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  );
}

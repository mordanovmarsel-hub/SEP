import { useMemo } from 'react';
import type { SepSolution } from '@sep/core';
import type { Config, Data, Layout } from 'plotly.js-dist-min';
import { formatSolutionHover } from '../lib/format.ts';
import { PlotlyChart } from './PlotlyChart.tsx';

interface ResultsChartProps {
  solutions: readonly SepSolution[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const CHART_CONFIG: Partial<Config> = {
  responsive: true,
  displaylogo: false,
  displayModeBar: true,
};

function markerSize(solution: SepSolution, selectedId: string | null): number {
  if (solution.id === selectedId) {
    return 9;
  }
  return solution.isPareto ? 7 : 5;
}

function buildTrace(
  solutions: readonly SepSolution[],
  selectedId: string | null,
  options: { name: string; color: string; symbol: string; lineWidth: number },
): Data {
  return {
    type: 'scatter3d',
    mode: 'markers',
    name: options.name,
    x: solutions.map((solution) => solution.averagePowerW),
    y: solutions.map((solution) => solution.specificMassKgPerM2),
    z: solutions.map((solution) => solution.fepAreaM2),
    text: solutions.map((solution) => formatSolutionHover(solution)),
    hoverinfo: 'text',
    customdata: solutions.map((solution) => solution.id),
    marker: {
      size: solutions.map((solution) => markerSize(solution, selectedId)),
      color: options.color,
      symbol: options.symbol,
      line: {
        width: options.lineWidth,
        color: '#111827',
      },
    },
  };
}

export function ResultsChart({ solutions, selectedId, onSelect }: ResultsChartProps) {
  const data = useMemo(() => {
    const regular = solutions.filter((solution) => !solution.isPareto);
    const pareto = solutions.filter((solution) => solution.isPareto);

    const traces: Data[] = [
      buildTrace(regular, selectedId, {
        name: 'Допустимые',
        color: '#2563eb',
        symbol: 'circle',
        lineWidth: 0,
      }),
      buildTrace(pareto, selectedId, {
        name: 'Парето',
        color: '#b45309',
        symbol: 'diamond',
        lineWidth: 1,
      }),
    ];

    const selected = solutions.find((solution) => solution.id === selectedId);
    if (selected) {
      traces.push(
        buildTrace([selected], selectedId, {
          name: 'Выбрано',
          color: '#111827',
          symbol: selected.isPareto ? 'diamond' : 'circle',
          lineWidth: 2,
        }),
      );
    }

    return traces;
  }, [selectedId, solutions]);

  const layout = useMemo<Partial<Layout>>(
    () => ({
      title: { text: '3D: мощность / удельная масса / площадь ФЭП' },
      margin: { l: 0, r: 0, b: 0, t: 48 },
      legend: { orientation: 'h' },
      scene: {
        xaxis: { title: { text: 'P_avg, Вт' } },
        yaxis: { title: { text: 'M/S, кг/м²' } },
        zaxis: { title: { text: 'S_FEP, м²' } },
      },
    }),
    [],
  );

  return (
    <section className="panel" aria-label="3D-график результатов">
      <h2>3D-представление</h2>
      <p className="hint">
        X — средняя мощность, Y — удельная масса, Z — площадь ФЭП. Точки Парето —
        ромбы. Клик по точке выделяет строку таблицы.
      </p>
      <PlotlyChart data={data} layout={layout} config={CHART_CONFIG} onPointClick={onSelect} />
    </section>
  );
}

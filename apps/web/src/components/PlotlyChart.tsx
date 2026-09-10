import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { Config, Data, Layout, PlotMouseEvent } from 'plotly.js-dist-min';
import { readSolutionId } from '../lib/read-solution-id.ts';

interface PlotlyChartProps {
  data: Data[];
  layout: Partial<Layout>;
  config?: Partial<Config>;
  onPointClick?: (solutionId: string) => void;
}

export function PlotlyChart({ data, layout, config, onPointClick }: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return undefined;
    }

    let cancelled = false;

    const render = async (): Promise<void> => {
      try {
        const graph = await Plotly.react(element, data, layout, config);
        if (cancelled) {
          Plotly.purge(graph);
          return;
        }

        graph.on('plotly_click', (event: PlotMouseEvent) => {
          const point = event.points[0];
          if (!point || !onPointClick) {
            return;
          }
          const solutionId = readSolutionId(point.customdata);
          if (solutionId) {
            onPointClick(solutionId);
          }
        });
      } catch {
        // Keep the empty container; do not leave an unhandled rejection.
      }
    };

    void render().catch(() => undefined);

    const handleResize = (): void => {
      void Plotly.Plots.resize(element);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      Plotly.purge(element);
    };
  }, [config, data, layout, onPointClick]);

  return <div ref={containerRef} className="plotly-root" data-testid="results-chart" />;
}

/**
 * Local wall-clock measurement of markParetoSolutions.
 * Not a CI unit test — timings depend on the machine.
 *
 * Usage (from packages/core):
 *   pnpm bench:pareto
 */
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import {
  DEFAULT_PARETO_CRITERIA,
  PARETO_METRIC_SENSE,
  type ParetoMetric,
  type ParetoSense,
  type SepSolution,
} from '../src/models';
import { markParetoSolutions } from '../src/pareto';

const SIZES = [10_000, 25_000, 50_000] as const;
const RUNS = 3;

function syntheticSolution(index: number): SepSolution {
  const areaTick = 1 + (index % 200);
  const fepAreaM2 = areaTick / 10;
  const totalMassKg = 1.63 * fepAreaM2 + ((index * 13) % 97) * 0.02 + (index % 17) * 0.05;
  const powerToMassWPerKg = 6 + ((index * 7) % 53) * 0.35 + (index % 11) * 0.08;
  const averagePowerW = powerToMassWPerKg * totalMassKg;

  return {
    id: `synth-${String(index)}`,
    photovoltaicCellId: index % 2 === 0 ? 'fep-a' : 'fep-b',
    photovoltaicCellName: index % 2 === 0 ? 'A' : 'B',
    fepEfficiency: 0.25 + (index % 5) * 0.05,
    structureType: index % 3 === 0 ? 'honeycomb' : 'frame',
    concentratorMaterialId: index % 4 === 0 ? null : 'bk7',
    concentratorMaterialName: index % 4 === 0 ? null : 'BK7',
    altitudeKm: 800,
    concentration: 1 + (index % 9),
    averageCosine: 0.65,
    sepAreaM2: fepAreaM2 * (1 + (index % 9)),
    fepAreaM2,
    averagePowerW,
    structureMassKg: totalMassKg * 0.7,
    concentratorMassKg: totalMassKg * 0.3,
    totalMassKg,
    specificMassKgPerM2: totalMassKg / fepAreaM2,
    powerToMassWPerKg,
    powerMarginW: averagePowerW - 20,
    massMarginKg: 50 - totalMassKg,
    areaMarginM2: 20 - fepAreaM2,
    isPareto: false,
  };
}

function buildSolutions(count: number): SepSolution[] {
  const solutions: SepSolution[] = [];
  for (let index = 0; index < count; index += 1) {
    solutions.push(syntheticSolution(index));
  }
  return solutions;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const middle = sorted[mid];
  if (middle === undefined) {
    return Number.NaN;
  }
  if (sorted.length % 2 === 1) {
    return middle;
  }
  const before = sorted[mid - 1];
  return before === undefined ? middle : (before + middle) / 2;
}

function measureMs(run: () => void): number {
  const started = performance.now();
  run();
  return performance.now() - started;
}

function formatMs(value: number): string {
  return value.toFixed(1);
}

function log(line: string): void {
  process.stdout.write(`${line}\n`);
}

function isBetter(left: number, right: number, sense: ParetoSense): boolean {
  return sense === 'minimize' ? left < right : left > right;
}

function isWorse(left: number, right: number, sense: ParetoSense): boolean {
  return sense === 'minimize' ? left > right : left < right;
}

function dominatesNaive(
  candidate: SepSolution,
  other: SepSolution,
  criteria: readonly ParetoMetric[],
): boolean {
  let strictlyBetter = false;

  for (const metric of criteria) {
    const sense = PARETO_METRIC_SENSE[metric];
    const candidateValue = candidate[metric];
    const otherValue = other[metric];

    if (isWorse(candidateValue, otherValue, sense)) {
      return false;
    }

    if (isBetter(candidateValue, otherValue, sense)) {
      strictlyBetter = true;
    }
  }

  return strictlyBetter;
}

/** Snapshot of the previous O(N²) pairwise scan, for local before/after only. */
function markParetoNaive(solutions: readonly SepSolution[]): SepSolution[] {
  const criteria: readonly ParetoMetric[] = DEFAULT_PARETO_CRITERIA;
  return solutions.map((solution) => ({
    ...solution,
    isPareto: !solutions.some((other) => dominatesNaive(other, solution, criteria)),
  }));
}

function measureImpl(
  label: string,
  mark: (solutions: readonly SepSolution[]) => SepSolution[],
  solutions: readonly SepSolution[],
): { line: string; flags: boolean[] } {
  const samples: number[] = [];
  let marked: SepSolution[] = [];

  for (let run = 0; run < RUNS; run += 1) {
    samples.push(
      measureMs(() => {
        marked = mark(solutions);
      }),
    );
  }

  const paretoCount = marked.filter((solution) => solution.isPareto).length;
  const line = [
    label.padEnd(11, ' '),
    `N=${String(solutions.length).padStart(5, ' ')}`,
    `samples=[${samples.map(formatMs).join(', ')}] ms`,
    `median=${formatMs(median(samples))} ms`,
    `pareto=${String(paretoCount)}`,
  ].join('  ');
  return { line, flags: marked.map((solution) => solution.isPareto) };
}

test('local Pareto wall-clock (not CI)', { timeout: 180_000 }, () => {
  log('Pareto wall-clock bench (not CI)');
  log('naive = pairwise O(N²); production = lex-sort + front sweep');
  log(`runs per size: ${String(RUNS)}`);
  log('');

  const report: string[] = [];
  markParetoSolutions(buildSolutions(500));
  markParetoNaive(buildSolutions(500));

  for (const size of SIZES) {
    const solutions = buildSolutions(size);
    const naive = measureImpl('naive', markParetoNaive, solutions);
    const production = measureImpl('production', markParetoSolutions, solutions);
    const flagsMatch =
      naive.flags.length === production.flags.length &&
      naive.flags.every((flag, index) => flag === production.flags[index]);

    log(naive.line);
    log(production.line);
    log(`flags match: ${flagsMatch ? 'yes' : 'NO'}`);
    log('');
    report.push(naive.line, production.line, `flags match: ${flagsMatch ? 'yes' : 'NO'}`);
  }

  const reportPath = join(tmpdir(), 'sep-bench-pareto-last.txt');
  writeFileSync(reportPath, `${report.join('\n')}\n`);
  log(`wrote ${reportPath}`);
});

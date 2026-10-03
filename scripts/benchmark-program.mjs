/** Controlled existing-engine benchmarks: same executable/dependencies, alternating
 * immutable baseline/current source, one discarded warmup and seven fresh processes.
 * Usage: node scripts/benchmark-program.mjs <baseline-dir> <output-json>
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cpus, totalmem } from 'node:os';
const [baseline, output] = process.argv.slice(2);
if (!baseline || !output) throw new Error('Expected baseline directory and output JSON');
const roots = { baseline: resolve(baseline), current: process.env.BENCHMARK_CURRENT_ROOT ? resolve(process.env.BENCHMARK_CURRENT_ROOT) : process.cwd() };
const scripts = (process.env.BENCHMARK_SCRIPTS ?? 'benchmark-obd.ts,benchmark-obd-v2.ts,benchmark-obd-v3.ts').split(',');
if (scripts.some(script => !['benchmark-obd.ts', 'benchmark-obd-v2.ts', 'benchmark-obd-v3.ts'].includes(script))) throw new Error('Unsupported benchmark script');
const iterations = Number(process.env.BENCHMARK_ITERATIONS ?? 7);
if (!Number.isInteger(iterations) || iterations < 1) throw new Error('Invalid iteration count');
const samples = [];
for (const script of scripts) {
  for (let iteration = -1; iteration < iterations; iteration++) {
    for (const label of iteration % 2 === 0 ? ['current', 'baseline'] : ['baseline', 'current']) {
      const result = spawnSync(process.execPath, ['--import', 'tsx', `scripts/${script}`], { cwd: roots[label], encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`${label}/${script}: ${result.stderr}`);
      const measurement = JSON.parse(result.stdout);
      samples.push({ script, label, iteration, warmup: iteration === -1, ...measurement });
      console.log(JSON.stringify({ script, label, iteration, ...measurement }));
      writeFileSync(output, JSON.stringify({ node: process.version, platform: process.platform, cpu: cpus()[0].model, logicalCpus: cpus().length, totalMemory: totalmem(), roots, samples }, null, 2));
    }
  }
}

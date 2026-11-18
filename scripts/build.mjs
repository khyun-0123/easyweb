import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

// --learned builds the experiment (docs/08_dev_plan.md): src/learned-hook.ts is swapped for
// src/learned-hook.experiment.ts and the output goes to dist-learned/, never to dist/.
const learned = process.argv.includes('--learned');
const outdir = learned ? 'dist-learned' : 'dist';
const learnedHook = { name: 'learned-hook', setup(b) {
  b.onResolve({ filter: /^\.\/learned-hook$/ }, args => ({ path: new URL(`../src/learned-hook${learned ? '.experiment' : ''}.ts`, import.meta.url).pathname }));
} };
await mkdir(outdir, { recursive: true });
await cp('extension/manifest.json', `${outdir}/manifest.json`);
const options = {
  entryPoints: ['src/background.ts', 'src/content.ts'], plugins: [learnedHook],
  outdir, bundle: true, format: 'iife', target: 'chrome120',
  sourcemap: true, logLevel: 'info', loader: { '.css': 'text' },
};
if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('변경 사항을 빌드합니다. Chrome 확장 관리 화면에서 새로고침하세요.');
} else {
  await build(options);
}

import { build, context } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await cp('extension/manifest.json', 'dist/manifest.json');
const options = {
  entryPoints: ['src/background.ts', 'src/content.ts'],
  outdir: 'dist', bundle: true, format: 'iife', target: 'chrome120',
  sourcemap: true, logLevel: 'info', loader: { '.css': 'text' },
};
if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('변경 사항을 빌드합니다. Chrome 확장 관리 화면에서 새로고침하세요.');
} else {
  await build(options);
}

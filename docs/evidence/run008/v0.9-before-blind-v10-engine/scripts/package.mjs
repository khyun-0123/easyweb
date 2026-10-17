import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log('node scripts/package.mjs [--output-dir=artifacts]\nBuilds twice, verifies identical output and source stability, then creates a reproducible installable candidate ZIP, SHA256SUMS, and package report. Does not publish or assert release acceptance. Requires python3.');
  process.exit(0);
}
const outputDir = path.resolve(process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length) ?? 'artifacts');
const sha256 = data => createHash('sha256').update(data).digest('hex');
const sorted = entries => entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
async function hashes(dir) {
  const result = {};
  for (const entry of sorted(await readdir(dir, { withFileTypes: true }))) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(result, await hashes(file));
    else if (entry.isFile()) result[file.split(path.sep).join('/')] = sha256(await readFile(file));
    else throw new Error(`Unsupported symlink or special file: ${file}`);
  }
  return result;
}
async function sourceHashes() {
  const files = { ...await hashes('src'), ...await hashes('extension') };
  for (const file of ['scripts/build.mjs', 'package.json', 'package-lock.json', 'tsconfig.json']) files[file] = sha256(await readFile(file));
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}
function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: [input === undefined ? 'ignore' : 'pipe', 'inherit', 'inherit'] });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code ?? signal}`)));
    if (input !== undefined) child.stdin.end(input);
  });
}
const before = await sourceHashes();
await run(process.execPath, ['scripts/build.mjs']);
const firstBuild = await hashes('dist');
await run(process.execPath, ['scripts/build.mjs']);
const secondBuild = await hashes('dist');
const after = await sourceHashes();
if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during packaging. Rerun after source freeze.');
if (JSON.stringify(firstBuild) !== JSON.stringify(secondBuild)) throw new Error('Two consecutive builds differ. No candidate package was created.');
const manifestBytes = await readFile('dist/manifest.json');
if (!manifestBytes.equals(await readFile('extension/manifest.json'))) throw new Error('Built manifest differs from source manifest.');
const manifest = JSON.parse(manifestBytes);
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
if (manifest.version !== pkg.version || !/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('Manifest and package versions must match a three-part release version.');
if (manifest.manifest_version !== 3 || JSON.stringify([...(manifest.permissions ?? [])].sort()) !== JSON.stringify(['activeTab', 'scripting']) || (manifest.host_permissions?.length ?? 0) || manifest.content_scripts?.length) throw new Error('Unexpected package permissions or automatic content injection. Review the manifest before packaging.');
for (const file of ['dist/manifest.json', 'dist/background.js', 'dist/content.js']) if (!(file in secondBuild)) throw new Error(`Missing installable file ${file}`);
const prefix = `EasyWeb-${pkg.version}-candidate`;
await mkdir(outputDir, { recursive: true });
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'easyweb-package-'));
try {
  const zipCode = `import hashlib,json,pathlib,sys,zipfile\nroot=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);prefix=sys.argv[3]\nfiles=sorted(p for p in root.rglob('*') if p.is_file())\nwith zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z:\n for p in files:\n  n=prefix+'/'+p.relative_to(root).as_posix();i=zipfile.ZipInfo(n,(1980,1,1,0,0,0));i.create_system=3;i.external_attr=0o100644<<16;i.compress_type=zipfile.ZIP_STORED;z.writestr(i,p.read_bytes())\nwith zipfile.ZipFile(out) as z:\n assert z.testzip() is None\n assert prefix+'/manifest.json' in z.namelist()\n for n in z.namelist():\n  assert not n.startswith('/') and '..' not in pathlib.PurePosixPath(n).parts\n  assert z.read(n)==(root/pathlib.PurePosixPath(n).relative_to(prefix)).read_bytes()\n`;
  const firstZip = path.join(tempDir, 'first.zip');
  const secondZip = path.join(tempDir, 'second.zip');
  await run('python3', ['-c', zipCode, path.resolve('dist'), firstZip, prefix]);
  await run('python3', ['-c', zipCode, path.resolve('dist'), secondZip, prefix]);
  const zipBytes = await readFile(firstZip);
  const zipHash = sha256(zipBytes);
  if (zipHash !== sha256(await readFile(secondZip))) throw new Error('Two deterministic ZIP generations differ.');
  if (JSON.stringify(after) !== JSON.stringify(await sourceHashes()) || JSON.stringify(secondBuild) !== JSON.stringify(await hashes('dist'))) throw new Error('Source or dist changed while ZIP was generated.');
  const zipName = `${prefix}.zip`;
  const reportName = `${prefix}.json`;
  const sourceDigest = sha256(Object.entries(after).map(([file, hash]) => `${file}\0${hash}\n`).join(''));
  const buildDigest = sha256(Object.entries(secondBuild).map(([file, hash]) => `${file}\0${hash}\n`).join(''));
  const report = {
    createdAt: new Date().toISOString(), version: pkg.version, classification: 'DEVELOPMENT_CANDIDATE',
    acceptance: 'NOT_ASSERTED: Packaging does not establish technical, accessibility, native installation, or user-study acceptance.',
    archive: { file: zipName, sha256: zipHash, bytes: zipBytes.length, installFolder: prefix, compression: 'stored', fixedEntryTimestamp: '1980-01-01T00:00:00', sortedPaths: true, fixedFileMode: '0644' },
    reproducibility: { twoBuildsIdentical: true, twoArchivesIdentical: true, sourceStable: true, note: 'Archive metadata and bytes are deterministic for identical dist bytes; createdAt in this separate report is informational.' },
    manifest: { sha256: sha256(manifestBytes), version: manifest.version, manifestVersion: manifest.manifest_version, permissions: manifest.permissions, hostPermissions: manifest.host_permissions ?? [], equalsSourceManifest: true },
    sourceDigestSha256: sourceDigest, buildDigestSha256: buildDigest, sourceFiles: after, packagedFiles: secondBuild,
    environment: { node: process.version, platform: process.platform, architecture: process.arch },
  };
  await writeFile(path.join(outputDir, zipName), zipBytes);
  const reportBytes = Buffer.from(JSON.stringify(report, null, 2) + '\n');
  await writeFile(path.join(outputDir, reportName), reportBytes);
  await writeFile(path.join(outputDir, 'SHA256SUMS'), `${zipHash}  ${zipName}\n${sha256(reportBytes)}  ${reportName}\n`);
  console.log(JSON.stringify({ version: pkg.version, classification: report.classification, zip: path.join(outputDir, zipName), sha256: zipHash, report: path.join(outputDir, reportName), checksums: path.join(outputDir, 'SHA256SUMS'), reproducibility: report.reproducibility }, null, 2));
} finally { await rm(tempDir, { recursive: true, force: true }); }

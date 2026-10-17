import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute } from 'node:path';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// A phase label alone cannot prove blinding. These checks bind the run to
// independently recorded frozen bytes; the annotation process still needs review.
export async function verifyFrozenFiles(freezePath, requiredPaths = [], root = process.cwd()) {
  if (!freezePath) throw new Error('Fresh evaluation requires both engine and dataset freeze records');
  const raw = await readFile(resolve(root, freezePath));
  const record = JSON.parse(raw);
  const entries = record.sourceFiles
    ? Object.entries(record.sourceFiles).map(([path, sha256]) => ({ path, sha256 }))
    : record.files;
  if (!Array.isArray(entries) || !entries.length) throw new Error('Freeze record has no files');
  const paths = new Set();
  for (const entry of entries) {
    if (typeof entry.path !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('Invalid freeze entry');
    const localPath = relative(resolve(root), resolve(root, entry.path));
    if (!localPath || localPath === '..' || localPath.startsWith('../') || isAbsolute(localPath)) throw new Error('Frozen file must be inside the project');
    if (paths.has(localPath)) throw new Error('Duplicate frozen file');
    paths.add(localPath);
    if (sha256(await readFile(resolve(root, localPath))) !== entry.sha256) throw new Error(`Frozen file changed: ${localPath}`);
  }
  for (const required of requiredPaths) {
    if (!paths.has(required)) throw new Error(`Freeze record missing required file: ${required}`);
  }
  return { path: freezePath, sha256: sha256(raw), checkedFiles: entries.length };
}

export function validateFreshMode({ engine, suite, split, outputDir, explicitOutput, engineFreeze, datasetFreeze }) {
  if (engine !== 'current' || !/^blind-v\d+(?:-v\d+)?$/.test(suite) || split !== 'holdout') throw new Error('Fresh evaluation requires current engine and a blind holdout suite');
  if (!explicitOutput || !outputDir) throw new Error('Fresh evaluation requires an explicit new output directory');
  if (!engineFreeze || !datasetFreeze) throw new Error('Fresh evaluation requires both engine and dataset freeze records');
}

// Adjudication never turns exposed examples into a new holdout. Bind both the
// corrected files and the original source files to the versioned change record.
export async function verifyAdjudicatedDataset(versionPath, requiredPaths = [], root = process.cwd()) {
  const record = JSON.parse(await readFile(resolve(root, versionPath), 'utf8'));
  if (record.classification !== 'ADJUDICATED_DEVELOPMENT' || record.freshHoldout !== false)
    throw new Error('Corrected annotations must be adjudicated development data');
  const corrected = await verifyFrozenFiles(versionPath, requiredPaths, root);
  const originals = [];
  const parents = [];
  const basePaths = new Set();
  for (const entry of record.files) {
    if (typeof entry.basePath !== 'string' || !/^[a-f0-9]{64}$/.test(entry.baseSha256)) throw new Error('Missing original annotation hash');
    const path = relative(resolve(root), resolve(root, entry.basePath));
    if (!path || path === '..' || path.startsWith('../') || isAbsolute(path) || basePaths.has(path)) throw new Error('Invalid or duplicate original annotation path');
    basePaths.add(path);
    if (sha256(await readFile(resolve(root, path))) !== entry.baseSha256) throw new Error(`Original adjudication input changed: ${path}`);
    originals.push({ path, sha256: entry.baseSha256 });
    if (entry.parentPath !== undefined || entry.parentSha256 !== undefined) {
      if (typeof entry.parentPath !== 'string' || !/^[a-f0-9]{64}$/.test(entry.parentSha256)) throw new Error('Invalid parent annotation hash');
      const parentPath = relative(resolve(root), resolve(root, entry.parentPath));
      if (!parentPath || parentPath === '..' || parentPath.startsWith('../') || isAbsolute(parentPath)) throw new Error('Invalid parent annotation path');
      if (sha256(await readFile(resolve(root, parentPath))) !== entry.parentSha256) throw new Error(`Parent adjudication input changed: ${parentPath}`);
      parents.push({ path: parentPath, sha256: entry.parentSha256 });
    }
  }
  return { ...corrected, version: record.version, classification: record.classification, freshHoldout: false,
    originals, parents, scope: 'Versioned correction, original and available parent hashes only; no independent quality claim.' };
}

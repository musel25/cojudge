import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareScriptReferences } from './script-reference.mjs';

test('prepares Python script answers and leaves standard problems for Java', () => {
  const root = mkdtempSync(join(tmpdir(), 'cojudge-script-reference-'));
  try {
    const scriptDir = join(root, 'problems', 'example-script');
    const standardDir = join(root, 'problems', 'example-standard');
    mkdirSync(scriptDir, { recursive: true });
    mkdirSync(standardDir, { recursive: true });
    writeFileSync(join(scriptDir, 'metadata.json'), JSON.stringify({ scriptMode: true }));
    writeFileSync(join(scriptDir, 'solution.md'), '## Answer\n\n```python\nprint(3)\n```\n');
    writeFileSync(join(standardDir, 'metadata.json'), JSON.stringify({ scriptMode: false }));

    const result = prepareScriptReferences(root, ['example-script', 'example-standard'], join(root, 'answers'));

    assert.deepEqual(result, { scriptSlugs: ['example-script'], standardSlugs: ['example-standard'] });
    assert.equal(readFileSync(join(root, 'answers', 'example-script', 'Solution.py'), 'utf8'), 'print(3)\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a script problem without a Python answer', () => {
  const root = mkdtempSync(join(tmpdir(), 'cojudge-script-reference-'));
  try {
    const scriptDir = join(root, 'problems', 'example-script');
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(join(scriptDir, 'metadata.json'), JSON.stringify({ scriptMode: true }));
    writeFileSync(join(scriptDir, 'solution.md'), 'No code here.\n');

    assert.throws(
      () => prepareScriptReferences(root, ['example-script'], join(root, 'answers')),
      /example-script.*Python answer/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

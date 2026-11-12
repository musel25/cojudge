import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function prepareScriptReferences(root, slugs, destination) {
  const scriptSlugs = [];
  const standardSlugs = [];
  for (const slug of slugs) {
    const problemDir = join(root, 'problems', slug);
    const metadata = JSON.parse(readFileSync(join(problemDir, 'metadata.json'), 'utf8'));
    if (!metadata.scriptMode) {
      standardSlugs.push(slug);
      continue;
    }
    const answer = readFileSync(join(problemDir, 'solution.md'), 'utf8');
    const match = answer.match(/```python[ \t]*\r?\n([\s\S]*?)\r?\n```/i);
    if (!match || !match[1].trim()) throw new Error(`${slug} needs a Python answer in solution.md.`);
    const solutionDir = join(destination, slug);
    mkdirSync(solutionDir, { recursive: true });
    writeFileSync(join(solutionDir, 'Solution.py'), `${match[1]}\n`);
    scriptSlugs.push(slug);
  }
  return { scriptSlugs, standardSlugs };
}

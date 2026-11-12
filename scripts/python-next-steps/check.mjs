// Compare every Python answer with its independent Java marker and examples.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loops } from './loops.mjs';
import { functions } from './functions.mjs';
import { lists } from './lists.mjs';
import { strings } from './strings.mjs';
import { collections } from './collections.mjs';
import { morePython } from './more-python.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const problems = [...loops, ...functions, ...lists, ...strings, ...collections, ...morePython];
const pythonDriver = String.raw`
import contextlib, io, json, sys

payload = json.load(sys.stdin)
results = []
for item in payload:
    codes = [item['solution'], item['starter']]
    outputs = []
    for code in codes:
        item_outputs = []
        for data in item['inputs']:
            lines = iter(data.splitlines())
            def fake_input(prompt=''):
                return next(lines)
            out = io.StringIO()
            try:
                with contextlib.redirect_stdout(out):
                    exec(compile(code, '<course-code>', 'exec'), {'input': fake_input, '__name__': '__main__'})
                item_outputs.append({'output': out.getvalue()})
            except Exception as error:
                item_outputs.append({'error': type(error).__name__ + ': ' + str(error)})
        outputs.append(item_outputs)
    results.append(outputs)
json.dump(results, sys.stdout)
`;
const javaHarness = String.raw`
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
class CheckMarker {
    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        Marker marker = new Marker();
        String row;
        while ((row = reader.readLine()) != null) {
            String[] parts = row.split("\\t", -1);
            String input = new String(Base64.getDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String actual = new String(Base64.getDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            String expected = marker.program(input);
            System.out.println(Base64.getEncoder().encodeToString(expected.getBytes(StandardCharsets.UTF_8)) + "\t" + marker.isCorrect(input, actual));
        }
    }
}
`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

const payload = problems.map(problem => ({
  solution: problem.solution, starter: problem.starter,
  inputs: [...problem.tests, ...problem.examples.map(example => example.input)]
}));
const python = JSON.parse(run('uv', ['run', '--no-project', 'python', '-c', pythonDriver], { input: JSON.stringify(payload) }));
const temporary = mkdtempSync(join(tmpdir(), 'cojudge-next-steps-check-'));
let checked = 0;
try {
  writeFileSync(join(temporary, 'CheckMarker.java'), javaHarness);
  for (const [index, problem] of problems.entries()) {
    const slug = `pns-${String(problem.num).padStart(2, '0')}-${problem.slug}`;
    const dir = join(root, 'problems', slug);
    run('javac', ['-d', temporary, join(dir, 'Marker.java'), join(temporary, 'CheckMarker.java')]);
    const answers = python[index][0];
    const starters = python[index][1];
    const inputs = payload[index].inputs;
    const request = inputs.map((input, i) => [input, answers[i].output ?? ''].map(
      value => Buffer.from(value).toString('base64')).join('\t')).join('\n') + '\n';
    const rows = run('java', ['-cp', temporary, 'CheckMarker'], { input: request }).trimEnd().split('\n');
    if (rows.length !== inputs.length) throw new Error(`${slug}: marker returned ${rows.length} of ${inputs.length} cases`);
    for (let i = 0; i < inputs.length; i++) {
      if (answers[i].error) throw new Error(`${slug} case ${i + 1}: Python answer raised ${answers[i].error}`);
      const [encoded, accepted] = rows[i].split('\t');
      const expected = Buffer.from(encoded, 'base64').toString();
      if (accepted !== 'true') throw new Error(`${slug} case ${i + 1}: Python ${JSON.stringify(answers[i].output)} differs from Java ${JSON.stringify(expected)}`);
      if (i >= problem.tests.length) {
        const example = problem.examples[i - problem.tests.length];
        const actual = answers[i].output?.trimEnd() ?? '';
        const shown = example.output.trimEnd();
        const equal = problem.kind === 'numbers'
          ? actual.split(/\s+/).filter(Boolean).join(' ') === shown.split(/\s+/).filter(Boolean).join(' ')
          : actual === shown;
        if (!equal) throw new Error(`${slug} example ${i - problem.tests.length + 1}: shown ${JSON.stringify(shown)} but answer gave ${JSON.stringify(actual)}`);
      }
    }
    if (!starters.some((result, i) => result.error || result.output !== answers[i].output)) {
      throw new Error(`${slug}: starter already passes every case`);
    }
    checked += problem.tests.length;
    console.log(`PASS: ${slug} (${problem.tests.length} cases)`);
  }
  console.log(`Checked ${checked} official cases and all examples across ${problems.length} lessons.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

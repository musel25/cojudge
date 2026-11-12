// Authoring source for the Python Next Steps course.
// Run `node scripts/python-next-steps/build.mjs` after editing the lesson data.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loops } from './loops.mjs';
import { functions } from './functions.mjs';
import { lists } from './lists.mjs';
import { strings } from './strings.mjs';
import { collections } from './collections.mjs';
import { morePython } from './more-python.mjs';
import { explanations } from './explanations.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const problems = [...loops, ...functions, ...lists, ...strings, ...collections, ...morePython];
const categories = [
  ['01-loops', loops], ['02-functions', functions], ['03-lists', lists],
  ['04-strings', strings], ['05-sets-and-dictionaries', collections],
  ['06-more-python', morePython]
];
function marker(problem) {
  const comparison = problem.kind === 'numbers'
    ? `try { return outputNumbers(program(input)).equals(outputNumbers(output)); } catch (NumberFormatException error) { return false; }`
    : `return program(input).equals(output.replace("\\r\\n", "\\n").replaceAll("\\n+$", ""));`;
  return `import java.util.*;

class Marker {
    private String[] lines;
    private int position;

    private String nextLine() {
        if (position >= lines.length) throw new IllegalArgumentException("Missing input line");
        return lines[position++];
    }

    private int nextInt() { return Integer.parseInt(nextLine().trim()); }

    private List<Integer> ints(String text) {
        List<Integer> values = new ArrayList<>();
        if (text.trim().isEmpty()) return values;
        for (String part : text.trim().split("\\\\s+")) values.add(Integer.parseInt(part));
        return values;
    }

    private String join(List<Integer> values) {
        StringJoiner result = new StringJoiner(" ");
        for (int value : values) result.add(String.valueOf(value));
        return result.toString();
    }

    private String clean(String text) {
        String[] rows = text.replace("\\r\\n", "\\n").split("\\n", -1);
        List<String> kept = new ArrayList<>();
        for (String row : rows) kept.add(row.replaceAll("[ \\t]+$", ""));
        while (!kept.isEmpty() && kept.get(kept.size() - 1).isEmpty()) kept.remove(kept.size() - 1);
        return String.join("\\n", kept);
    }

    private List<Integer> outputNumbers(String text) {
        return ints(clean(text));
    }

    private String answer() {
${problem.java.trim().split('\n').map(line => `        ${line}`).join('\n')}
    }

    public String program(String input) {
        lines = (input == null ? "" : input).replace("\\r\\n", "\\n").split("\\n", -1);
        position = 0;
        return answer();
    }

    public boolean isCorrect(String input, String output) {
        ${comparison}
    }
}
`;
}

function statement(problem, explanation) {
  const hasSeveralNumbers = problem.kind === 'numbers' && problem.examples.some(
    example => example.output.trim().split(/\s+/).filter(Boolean).length > 1
  );
  const display = (value, emptyLabel) => value === '' || value === '\n'
    ? `_${emptyLabel}_`
    : `\x60\x60\x60text\n${value.replace(/\n$/, '')}\n\x60\x60\x60`;
  const examples = problem.examples.map(({ input, output }, index) =>
    `**Example ${index + 1}**\n\nInput:\n\n${display(input, 'One blank line')}\n\nResult:\n\n${display(output, 'No output')}\n\nWhy: ${explanation.examples[index]}`
  ).join('\n\n');
  return `## Learn

${problem.learn}

\x60\x60\x60python
${problem.learnCode.trim()}
\x60\x60\x60

This code prints:

\x60\x60\x60text
${explanation.learnOutput}
\x60\x60\x60

## Your task

${problem.task}

${examples}

${hasSeveralNumbers ? 'When the result has several numbers, you can put spaces or new lines between them.\n\n' : ''}${problem.note ? `${problem.note}\n\n` : ''}Start with the supplied code. Change the code near the comment.
`;
}

function solution(problem) {
  return `## Steps

${problem.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Edge case

${problem.edge}

## One correct answer

\x60\x60\x60python
${problem.solution.trim()}
\x60\x60\x60
${problem.source ? `\nInspired by [this public exercise](${problem.source}). The task text and cases here are new.\n` : ''}`;
}

if (problems.length !== 40 || explanations.length !== problems.length) throw new Error('Expected 40 lessons and explanations');
for (const [index, problem] of problems.entries()) {
  const [learnOutput, exampleReasons] = explanations[index];
  if (problem.num !== index + 1 || problem.tests.length < 25 || !problem.tests.every(x => typeof x === 'string') ||
      typeof learnOutput !== 'string' || exampleReasons.length !== problem.examples.length ||
      exampleReasons.some(reason => !reason)) {
    throw new Error(`Invalid order or tests for ${problem.slug}`);
  }
  const slug = `pns-${String(problem.num).padStart(2, '0')}-${problem.slug}`;
  const dir = join(root, 'problems', slug);
  mkdirSync(dir, { recursive: true });
  const metadata = {
    id: slug, title: `${String(problem.num).padStart(2, '0')}. ${problem.title}`,
    difficulty: problem.num <= 24 ? 'Easy' : 'Medium', link: '',
    category: problem.category,
    examples: problem.examples,
    starterCode: { python: problem.starter.trimEnd() + '\n' },
    testCases: problem.tests.slice(0, 3).map(input => ({ input })),
    functionName: 'program', params: [{ name: 'input', type: 'string' }],
    outputType: 'string', scriptMode: true,
    hints: problem.hints
  };
  writeFileSync(join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
  writeFileSync(join(dir, 'statement.md'), statement(problem, { learnOutput, examples: exampleReasons }));
  writeFileSync(join(dir, 'solution.md'), solution(problem));
  writeFileSync(join(dir, 'official-tests.json'), JSON.stringify(problem.tests.map(input => ({ input })), null, 2) + '\n');
  writeFileSync(join(dir, 'Marker.java'), marker(problem));
}

const course = {
  title: 'Python Next Steps',
  description: '40 short Python exercises after Python First Steps. Learn loops, functions, lists, strings, sets, dictionaries, and small programs. Each task has a code example with its output, explained results, and a worked answer. Select Python.',
  'category-order': categories.map(([name]) => name),
  'problems-of-category': Object.fromEntries(categories.map(([name, entries]) => [name,
    entries.map(problem => `pns-${String(problem.num).padStart(2, '0')}-${problem.slug}`)])),
  'problem-numbers': Object.fromEntries(problems.map(problem => [
    `pns-${String(problem.num).padStart(2, '0')}-${problem.slug}`, problem.num
  ]))
};
const courseDir = join(root, 'courses', 'python-next-steps');
mkdirSync(courseDir, { recursive: true });
writeFileSync(join(courseDir, 'courseinfo.json'), JSON.stringify(course, null, 2) + '\n');
console.log(`Wrote ${problems.length} Python Next Steps problems.`);

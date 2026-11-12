import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generatePythonScriptRunner } from './pythonScript';

// Run the generated main.py like the judge container does and return each test's output.
async function runScript(program: string, inputs: (string | undefined)[]) {
    const folder = await mkdtemp(path.join(tmpdir(), 'cojudge-script-'));
    try {
        await writeFile(path.join(folder, 'Solution.py'), program);
        await writeFile(path.join(folder, 'main.py'), generatePythonScriptRunner(inputs.map((input) => ({ input }))));
        const stdout = execFileSync('uv', ['run', '--no-project', '--python', '3.11', 'python', '-B', '-u', 'main.py'],
            { cwd: folder, encoding: 'utf8' });
        return stdout.split('---\n').filter((chunk) => chunk.trim() !== '').map((chunk) => {
            const lines = chunk.split('\n');
            const index = lines.findIndex((line) => line.startsWith(':::RESULT:::'));
            const parts = [lines[index].slice(':::RESULT:::'.length), ...lines.slice(index + 1)];
            if (parts.at(-1) === '') parts.pop();
            return parts.join('\n');
        });
    } finally {
        await rm(folder, { recursive: true, force: true });
    }
}

describe('Python script problems', () => {
    it('returns printed lines without a class or test code', async () => {
        expect(await runScript('print("Hello, World!")\nprint("Bye")\n', [''])).toEqual(['Hello, World!\nBye']);
    });

    it('gives each test its own input lines', async () => {
        const program = 'name = input()\nage = int(input())\nprint("Hi", name)\nif age >= 13:\n    print("teen")\nelse:\n    print("kid")\n';
        expect(await runScript(program, ['Ana\n14', 'Leo\n9'])).toEqual(['Hi Ana\nteen', 'Hi Leo\nkid']);
    });

    it('does not judge the question text of input()', async () => {
        expect(await runScript('name = input("What is your name? ")\nprint("Hi", name)\n', ['Ana'])).toEqual(['Hi Ana']);
    });

    it('runs a test without input', async () => {
        expect(await runScript('print(2 + 3)\n', [undefined])).toEqual(['5']);
    });

    it('keeps text and emoji exactly', async () => {
        expect(await runScript('print("  two spaces  ")\nprint("ñ 🐱")\n', [''])).toEqual(['  two spaces  \nñ 🐱']);
    });

    it('explains errors with the line number of the learner code', async () => {
        const [result] = await runScript('print("ok")\npritn("oops")\n', ['']);
        expect(result).toMatch(/^ok\nError on line 2: NameError: name 'pritn' is not defined/);
        const [syntax] = await runScript('print("a"\n', ['']);
        expect(syntax).toMatch(/^Error on line 1: SyntaxError/);
    });

    it('explains a missing input line', async () => {
        const [result] = await runScript('a = input()\nb = input()\nprint(a + b)\n', ['only one']);
        expect(result).toContain('EOFError');
        expect(result).toContain('more times than this test has lines');
    });

    it('stops a program that never ends', async () => {
        const [result] = await runScript('print("start")\nwhile True:\n    pass\n', ['']);
        expect(result).toBe('start\nYour program took too long. Check for a loop that never ends.');
    }, 15000);
});

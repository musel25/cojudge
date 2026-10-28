import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withPythonExerciseAssertions } from './pythonAssertions';
import { presentAssertionResult } from '../utils/assertionResult';

// The same compile/report interface used by saved Pybites exercise runners.
async function exercise(tests: string, implementation = '') {
    const folder = await mkdtemp(path.join(tmpdir(), 'cojudge-assertions-'));
    try {
        await writeFile(path.join(folder, 'Solution.py'), `
${implementation}
import traceback
_PB_MODULE = 'exercise'
_PB_TESTS = ${JSON.stringify(tests)}
def _report(test_id, error, test_file):
    frames = [f for f in traceback.extract_tb(error.__traceback__) if f.filename == test_file]
    return f'FAILED {test_id} | {type(error).__name__}: {error} | test line {frames[-1].lineno}'
class Solution:
    def run(self):
        namespace = dict(globals())
        try:
            exec(compile(_PB_TESTS, 'test_exercise.py', 'exec'), namespace)
            namespace['test_example']()
            return 'passed'
        except Exception as error:
            return _report('test_example', error, 'test_exercise.py')
`);
        const runner = withPythonExerciseAssertions("if __name__ == '__main__':\n    from Solution import Solution\n    print(Solution().run())\n");
        await writeFile(path.join(folder, 'main.py'), runner);
        return execFileSync('uv', ['run', '--no-project', '--python', '3.11', 'python', 'main.py'],
            { cwd: folder, encoding: 'utf8' }).trim();
    } finally {
        await rm(folder, { recursive: true, force: true });
    }
}

function display(output: string) {
    return presentAssertionResult({ output, correctAnswer: 'passed', isCorrect: output === 'passed' });
}

describe('Python exercise assertion values', () => {
    it('captures the actual returned string and expected string from saved test code', async () => {
        const output = await exercise('def test_example():\n    assert rev_engine() == "A loud bike goes Vroom vroom!"',
            'def rev_engine():\n    return "x y with 2 wheels goes Vroom vroom!"');
        expect(display(output)).toMatchObject({
            isCorrect: false,
            output: "'x y with 2 wheels goes Vroom vroom!'",
            correctAnswer: "'A loud bike goes Vroom vroom!'",
            failureDetail: expect.stringContaining('FAILED test_example | AssertionError'),
        });
        expect(display(output).failureDetail).toContain('test line 2');
    });

    it('evaluates each operand once and keeps assertion messages lazy', async () => {
        const output = await exercise(`def test_example():
    calls = []
    def actual():
        calls.append(1)
        return len(calls)
    assert actual() == 2, f"called {len(calls)} time(s)"
`);
        expect(display(output)).toMatchObject({ output: '1', correctAnswer: '2',
            failureDetail: expect.stringContaining('called 1 time(s)') });
        expect(await exercise('def test_example():\n    assert 1 == 1, 1 / 0')).toBe('passed');
    });

    it('keeps whitespace and Python value types visible', async () => {
        expect(display(await exercise('def test_example():\n    assert "hello\\n " == "hello\\n"')))
            .toMatchObject({ output: "'hello\\n '", correctAnswer: "'hello\\n'" });
        expect(display(await exercise('def test_example():\n    assert None == []')))
            .toMatchObject({ output: 'None', correctAnswer: '[]' });
    });

    it('keeps ordinary failures and chained comparisons unchanged', async () => {
        const error = await exercise('def test_example():\n    raise ValueError("bad input")');
        expect(error).toContain('ValueError: bad input');
        expect(display(error)).not.toHaveProperty('failureDetail');
        expect(await exercise('def test_example():\n    assert 1 == 2 == 3')).toContain('FAILED test_example');
        expect(await exercise('def test_example():\n    assert False')).toContain('FAILED test_example');
    });

    it('preserves future flags inherited from saved learner code', async () => {
        expect(await exercise('def test_example() -> MissingType:\n    assert 1 == 1',
            'from __future__ import annotations')).toBe('passed');
    });

    it('selects the failed assertion when two assertions share a source line', async () => {
        expect(display(await exercise('def test_example():\n    assert 1 == 1; assert 2 == 3')))
            .toMatchObject({ output: '2', correctAnswer: '3' });
        expect(display(await exercise('def test_example():\n    assert 1 == 1; assert False')))
            .not.toHaveProperty('failureDetail');
        expect(display(await exercise('def test_example():\n    assert 1 == 1; assert fail() == 3',
            'def fail():\n    raise AssertionError("no returned value")')))
            .not.toHaveProperty('failureDetail');
    });

    it('does not change normal solution modules', async () => {
        const folder = await mkdtemp(path.join(tmpdir(), 'cojudge-normal-'));
        try {
            await writeFile(path.join(folder, 'Solution.py'), 'class Solution:\n    def run(self): return 42\n');
            await writeFile(path.join(folder, 'main.py'), withPythonExerciseAssertions(
                "if __name__ == '__main__':\n    from Solution import Solution\n    print(Solution().run())\n"));
            expect(execFileSync('uv', ['run', '--no-project', '--python', '3.11', 'python', 'main.py'],
                { cwd: folder, encoding: 'utf8' }).trim()).toBe('42');
        } finally { await rm(folder, { recursive: true, force: true }); }
    });
});

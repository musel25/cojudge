import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withPythonExerciseAssertions } from './pythonAssertions';
import { presentAssertionResult } from '../utils/assertionResult';

// The same compile/report interface used by saved Pybites exercise runners.
async function exercise(tests: string, implementation = '', throughSolve = false) {
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
        return solve()
def _call(function, namespace, given, buffer, cleanups, cache):
    return function()
def solve():
        namespace = dict(globals())
        try:
            exec(compile(_PB_TESTS, 'test_exercise.py', 'exec'), namespace)
            _call(namespace['test_example'], namespace, {}, None, [], {})
            return 'passed'
        except Exception as error:
            return _report('test_example', error, 'test_exercise.py')
`);
        const runner = withPythonExerciseAssertions("if __name__ == '__main__':\n    from Solution import Solution\n    print(Solution().run())\n");
        await writeFile(path.join(folder, 'main.py'), runner);
        const output = execFileSync('uv', ['run', '--no-project', '--python', '3.11', 'python', 'main.py'],
            { cwd: folder, encoding: 'utf8' }).trim();
        return throughSolve ? output : output.split('\n').at(-1)!;
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

    it('reports runtime errors and the failed condition for other assertion forms', async () => {
        const error = await exercise('def test_example():\n    raise ValueError("bad input")');
        expect(display(error)).toMatchObject({ output: 'ValueError: bad input',
            correctAnswer: expect.stringContaining('without an unexpected exception') });
        expect(display(await exercise('def test_example():\n    assert 1 == 2 == 3')))
            .toMatchObject({ output: 'False', correctAnswer: '1 == 2 == 3 must be true' });
        expect(display(await exercise('def test_example():\n    assert False')))
            .toMatchObject({ output: 'False', correctAnswer: 'False must be true' });
    });

    it('preserves future flags inherited from saved learner code', async () => {
        expect(await exercise('def test_example() -> MissingType:\n    assert 1 == 1',
            'from __future__ import annotations')).toBe('passed');
    });

    it('selects the failed assertion when two assertions share a source line', async () => {
        expect(display(await exercise('def test_example():\n    assert 1 == 1; assert 2 == 3')))
            .toMatchObject({ output: '2', correctAnswer: '3' });
        expect(display(await exercise('def test_example():\n    assert 1 == 1; assert False')))
            .toMatchObject({ output: 'False', correctAnswer: 'False must be true' });
        expect(display(await exercise('def test_example():\n    assert 1 == 1; raise AssertionError("other failure")')))
            .toMatchObject({ output: 'AssertionError: other failure' });
        expect(display(await exercise('def test_example():\n    assert 1 == 1; assert fail() == 3',
            'def fail():\n    raise AssertionError("no returned value")')))
            .toMatchObject({ output: 'AssertionError: no returned value' });
    });

    it('shows the concrete invalid input and returned value when an expected error is missing', async () => {
        const output = await exercise(`def test_example():
    bad = 'ffffff'
    with raises(ValueError):
        Color.hex2rgb(bad)
`, `class raises:
    def __init__(self, expected): self.expected = expected
    def __enter__(self): return self
    def __exit__(self, kind, error, tb):
        if kind is None: raise AssertionError(f"DID NOT RAISE {self.expected}")
        return issubclass(kind, self.expected)
class Color:
    @staticmethod
    def hex2rgb(value): return (255, 255, 255)
`);
        expect(display(output)).toMatchObject({
            output: 'Returned (255, 255, 255); no exception was raised',
            correctAnswer: 'Raise ValueError',
            testDetails: {
                title: 'test_example',
                code: expect.stringContaining("Color.hex2rgb('ffffff')"),
            },
        });
        expect(display(output).testDetails?.code).toContain("bad = 'ffffff'");
    });

    it('captures concrete calls without repeating side effects and includes printed output', async () => {
        const output = await exercise(`def test_example():
    items = [3]
    print('checking item')
    assert consume(items) == 4
`, 'def consume(items):\n    return items.pop()');
        const result = display(output.split('\n').at(-1)!);
        expect(result).toMatchObject({ output: '3', correctAnswer: '4', testDetails: {
            code: expect.stringContaining('consume([3])'),
        } });
    });

    it('preserves short circuit evaluation and lazy assertion messages', async () => {
        expect(await exercise('def test_example():\n    assert True or 1 / 0, 1 / 0')).toBe('passed');
        expect(display(await exercise('def test_example():\n    assert False and 1 / 0')))
            .toMatchObject({ output: 'False', correctAnswer: 'False and 1 / 0 must be true' });
    });

    it('does not execute learner repr methods while collecting diagnostics', async () => {
        expect(await exercise('def test_example():\n    thing = Thing()\n    assert thing.reprs == 0', `class Thing:
    def __init__(self): self.reprs = 0
    def __repr__(self):
        self.reprs += 1
        return 'Thing'
`)).toBe('passed');
    });

    it('does not reuse an expected exception after another context handles that failure', async () => {
        expect(display(await exercise(`def test_example():
    with raises(AssertionError):
        with raises(ValueError):
            abs(-3)
    assert 1 == 2
`, `class raises:
    def __init__(self, expected): self.expected = expected
    def __enter__(self): return self
    def __exit__(self, kind, error, tb):
        if kind is None: raise AssertionError('DID NOT RAISE')
        return issubclass(kind, self.expected)
`))).toMatchObject({ output: '1', correctAnswer: '2' });
    });

    it('keeps console text that the test consumes through capsys', async () => {
        const raw = await exercise(`def test_example():
    captured = _CapSys().readouterr()
    assert captured.out == 'hello console'
`, `from collections import namedtuple
class _CapSys:
    def readouterr(self):
        return namedtuple('Capture', 'out err')('hello console', 'hello stderr')
`, true);
        const lines = raw.split('\n');
        expect(presentAssertionResult({ output: lines.at(-1), isCorrect: true, logs: lines.slice(0, -1).join('\n') }))
            .toMatchObject({ logs: 'hello consolehello stderr' });
    });

    it('provides successful test inputs and values separately from the unchanged judge output', async () => {
        const raw = await exercise('def test_example():\n    assert double(3) == 6',
            'def double(value): return value * 2', true);
        const lines = raw.split('\n');
        expect(lines.at(-1)).toBe('passed');
        expect(presentAssertionResult({ output: 'passed', correctAnswer: 'passed', isCorrect: true,
            logs: lines.slice(0, -1).join('\n') })).toMatchObject({
                output: '6', correctAnswer: '6', logs: '',
                testDetails: { code: expect.stringContaining('double(3) -> 6') },
            });
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

import { expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withPythonExerciseAssertions } from './pythonAssertions';
import { presentAssertionResult } from '../utils/assertionResult';

async function exercise(tests: string, implementation: string, target: string) {
    const folder = await mkdtemp(path.join(tmpdir(), 'cojudge-pytest-'));
    try {
        await writeFile(path.join(folder, 'Solution.py'), `
_FA_TESTS = ${JSON.stringify(tests)}
class Solution:
    def run(self, payload):
        import subprocess, sys
        from pathlib import Path
        Path('app.py').write_text(${JSON.stringify(implementation)})
        Path('test_bite.py').write_text(_FA_TESTS)
        result = subprocess.run([sys.executable, '-m', 'pytest', '-q', 'test_bite.py'], capture_output=True, text=True)
        return 'passed' if result.returncode == 0 else 'FAILED test_double | ' + result.stdout.replace('\\n', ' | ')
`);
        await writeFile(path.join(folder, 'main.py'), withPythonExerciseAssertions(
            `if __name__ == '__main__':\n    from Solution import Solution\n    print(Solution().run(${JSON.stringify(JSON.stringify({ test: target }))}))\n`));
        const raw = execFileSync('uv', ['run', '--no-project', '--python', '3.11', '--with', 'pytest==8.3.5', 'python', 'main.py'],
            { cwd: folder, encoding: 'utf8', env: { ...process.env, PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1' } }).trim();
        const lines = raw.split('\n');
        return presentAssertionResult({ output: lines.at(-1), correctAnswer: 'passed', isCorrect: lines.at(-1) === 'passed',
            logs: lines.slice(0, -1).join('\n') });
    } finally { await rm(folder, { recursive: true, force: true }); }
}

it('shows concrete arguments, actual output, expected output, and console from real pytest', async () => {
    expect(await exercise('from app import double\ndef test_double():\n    assert double(3) == 6\n',
        'def double(n):\n    print("called double")\n    return n + 1\n', 'test_double')).toMatchObject({
                output: '4', correctAnswer: '6', logs: expect.stringContaining('called double'),
                testDetails: { code: expect.stringContaining('double(n=3) -> 4') },
                failureDetail: expect.stringContaining('assert double(3) == 6'),
            });
}, 30000);

it('does not show a previous comparison when the next test fixture fails during setup', async () => {
    expect(await exercise(`import pytest
def test_one():
    assert 1 == 2
@pytest.fixture
def broken():
    raise ValueError('setup failed')
def test_two(broken):
    assert True
`, '', 'test_two')).toMatchObject({
        output: 'ValueError: setup failed', correctAnswer: 'Complete all checks in the test',
        failureDetail: expect.stringContaining('setup failed'),
    });
});

it('shows the returned value when real pytest expected an exception', async () => {
    expect(await exercise(`import pytest
from app import convert
def test_invalid():
    with pytest.raises(ValueError):
        convert('ffffff')
`, 'def convert(value): return (255, 255, 255)', 'test_invalid')).toMatchObject({
        output: 'Returned (255, 255, 255); no exception was raised', correctAnswer: 'Raise ValueError',
        testDetails: { code: expect.stringContaining("convert(value='ffffff')") },
    });
});

it('keeps passing tests passing when learner repr has side effects', async () => {
    expect(await exercise(`from app import Thing
def test_repr():
    thing = Thing()
    assert thing.reprs == 0
`, `class Thing:
    def __init__(self): self.reprs = 0
    def __repr__(self):
        self.reprs += 1
        return 'Thing'
`, 'test_repr')).toMatchObject({ isCorrect: true });
});

it('does not reuse a comparison error that the test handled', async () => {
    expect(await exercise(`import pytest
def test_handled():
    with pytest.raises(AssertionError):
        assert 1 == 2
    raise ValueError('actual failure')
`, '', 'test_handled')).toMatchObject({ output: 'ValueError: actual failure' });
});

it('keeps console output consumed by a real pytest capture fixture', async () => {
    expect(await exercise(`from app import emit
def test_console(capsys):
    emit()
    assert capsys.readouterr().out == 'hello console\\n'
`, 'def emit(): print("hello console")', 'test_console'))
        .toMatchObject({ isCorrect: true, logs: 'hello console\n' });
});

it('distinguishes exception propagation through finally from a handled exception return', async () => {
    const result = await exercise(`import pytest
from app import fail, recover
def test_finally():
    with pytest.raises(ValueError):
        fail()
    assert recover() == 3
`, `def fail():
    try:
        raise ValueError('boom')
    finally:
        print('cleanup')
def recover():
    try:
        raise ValueError('handled')
    except ValueError:
        return 3
`, 'test_finally');
    expect(result).toMatchObject({ isCorrect: true, testDetails: {
        code: expect.stringContaining("fail() -> raised ValueError: ('boom',)"),
    } });
    expect(result.testDetails?.code).toContain('recover() -> 3');
});

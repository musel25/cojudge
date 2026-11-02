// Script problems run the learner's whole file as a program. Each test case
// gives the program its `input` text on stdin. The printed text is the result.
// This lets beginner exercises use plain `print()` and `input()` without a
// Solution class or supplied test code in the editor.

/** Seconds that one script test can run before it stops. */
export const SCRIPT_TIMEOUT_SECONDS = 2;

export function generatePythonScriptRunner(testCases: any[], inputName = 'input'): string {
    const inputs = testCases.map((tc) => {
        const value = tc?.[inputName];
        return value === undefined || value === null ? '' : String(value);
    });
    // JSON in a Python string literal: json.dumps output contains no raw newlines.
    const payload = JSON.stringify(JSON.stringify(inputs));
    return String.raw`import json
import os
import re
import subprocess
import sys
import time

_INPUTS = json.loads(${payload})
_ENV = dict(os.environ, PYTHONIOENCODING='utf-8', PYTHONDONTWRITEBYTECODE='1', PYTHONUNBUFFERED='1')
# input("Your name? ") would print its question into the judged output.
# The judge gives the answer directly, so the question text is not printed.
_START = (
    "import builtins, runpy, sys\n"
    "_read = builtins.input\n"
    "builtins.input = lambda prompt='': _read()\n"
    "sys.argv = ['Solution.py']\n"
    "runpy.run_path('Solution.py', run_name='__main__')\n"
)


def _friendly_error(stderr):
    lines = [line for line in stderr.strip().splitlines() if line.strip()]
    if not lines:
        return 'Your program stopped with an error.'
    message = lines[-1].strip()
    number = None
    for line in lines:
        found = re.search(r'File "[^"]*Solution\.py", line (\d+)', line)
        if found:
            number = found.group(1)
    if message.startswith('EOFError'):
        message += ' (your program called input() more times than this test has lines)'
    return ('Error on line ' + number + ': ' if number else 'Error: ') + message


def _run(text):
    if text and not text.endswith('\n'):
        text += '\n'
    try:
        done = subprocess.run([sys.executable, '-B', '-c', _START], input=text, capture_output=True,
                              text=True, encoding='utf-8', errors='replace', timeout=${SCRIPT_TIMEOUT_SECONDS}, env=_ENV)
    except subprocess.TimeoutExpired as stopped:
        printed = stopped.stdout or ''
        if isinstance(printed, bytes):
            printed = printed.decode('utf-8', 'replace')
        return printed, 'Your program took too long. Check for a loop that never ends.'
    if done.returncode != 0:
        return done.stdout, _friendly_error(done.stderr)
    return done.stdout, None


for _text in _INPUTS:
    _start = time.perf_counter_ns()
    _printed, _error = _run(_text)
    _elapsed = time.perf_counter_ns() - _start
    _printed = _printed.replace('\r\n', '\n').rstrip('\n')
    if _error:
        _printed = (_printed + '\n' if _printed else '') + _error
    print(':::TIME:::' + str(_elapsed))
    print(':::RESULT:::' + _printed)
    print('---')
`;
}

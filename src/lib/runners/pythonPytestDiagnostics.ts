import { pythonValueDisplay } from './pythonValueDisplay';

// A temporary pytest plugin. It runs inside the existing offline Python image.
// The adapter keeps its original verdict; details travel through captured logs.
export const pythonPytestDiagnostics = String.raw`
def _cojudge_enable_pytest_values(module):
    if not isinstance(getattr(module, '_FA_TESTS', getattr(module, '_SM_TESTS', None)), str):
        return
    import json
    import os
    from pathlib import Path
    import subprocess
    import tempfile
    original_run = module.Solution.run
    diagnostics = {}
    plugin = r'''
${pythonValueDisplay}
import inspect
import dis
import json
import os
from pathlib import Path
import re
import sys
import pytest

_calls, _compared, _frames, _consumed = [], [], {}, []

def _display(value):
    return _cojudge_display_value(value)

def _trace(frame, event, arg):
    filename = Path(frame.f_code.co_filename)
    if filename.parent != Path.cwd() or filename.name.startswith(('cojudge_', 'conftest')):
        return None
    if filename.name.startswith('test_'):
        if event == 'exception' and _compared and len(_compared[-1]) == 2 and isinstance(arg[1], AssertionError):
            _compared[-1] = (*_compared[-1], arg[1])
        return _trace
    key = id(frame)
    if event == 'call':
        names = frame.f_code.co_varnames[:frame.f_code.co_argcount + frame.f_code.co_kwonlyargcount]
        record = {'call': frame.f_code.co_name + '(' + ', '.join(name + '=' + _display(frame.f_locals[name]) for name in names if name in frame.f_locals) + ')'}
        _frames[key] = record
        _calls.append(record)
        del _calls[:-30]
    elif key in _frames:
        record = _frames[key]
        if event == 'exception':
            record['error'] = arg[0].__name__ + ': ' + _display(BaseException.args.__get__(arg[1]))
        elif event == 'return':
            instruction = dis.opname[frame.f_code.co_code[frame.f_lasti]]
            if instruction.startswith('RETURN'):
                record.pop('error', None)
                record['returned'] = _display(arg)
            _frames.pop(key, None)
    return _trace

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_setup(item):
    _calls.clear()
    _compared.clear()
    _frames.clear()
    _consumed.clear()
    yield

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_call(item):
    previous = sys.gettrace()
    sys.settrace(_trace)
    try:
        yield
    finally:
        sys.settrace(previous)

def pytest_configure(config):
    original = pytest.CaptureFixture.readouterr
    def readouterr(self):
        captured = original(self)
        _consumed.append(captured.out + captured.err)
        return captured
    pytest.CaptureFixture.readouterr = readouterr

def pytest_assertrepr_compare(config, op, left, right):
    _compared[:] = [(_display(left), _display(right) if op == '==' else op + ' ' + _display(right))]

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when != 'call' and not report.failed:
        return
    code = inspect.getsource(item.function)
    values = []
    if getattr(item, 'callspec', None):
        values.extend(name + ' = ' + _display(value) for name, value in item.callspec.params.items())
    if call.excinfo:
        for entry in call.excinfo.traceback:
            if entry.path == item.path:
                values.extend(name + ' = ' + _display(value) for name, value in entry.frame.f_locals.items()
                    if not name.startswith('@') and not name.startswith('__'))
    actual = call.excinfo.typename + ': ' + str(call.excinfo.value) if call.excinfo else 'Test completed without an unexpected exception'
    expected = 'Complete all checks in the test'
    if report.failed and report.when == 'call' and _compared and len(_compared[-1]) == 3 and _compared[-1][2] is call.excinfo.value:
        actual, expected = _compared[-1][:2]
    elif report.failed and call.excinfo:
        missing = re.search(r"DID NOT RAISE <class '([^']+)'>", str(call.excinfo.value))
        if missing:
            expected = 'Raise ' + missing.group(1)
            returned = next((record['returned'] for record in reversed(_calls) if 'returned' in record), None)
            actual = 'Returned ' + returned + '; no exception was raised' if returned is not None else 'No exception was raised'
    calls = '\n'.join(record['call'] + (' -> raised ' + record['error'] if 'error' in record else ' -> ' + record.get('returned', '<not returned>')) for record in _calls)
    if not report.failed and calls:
        actual = calls
    detail = {'actual': actual, 'expected': expected,
        'testDetails': {'title': item.name, 'code': code + '\nTest values:\n' + '\n'.join(values[:20]) + '\nCalls:\n' + calls},
        'logs': ''.join(_consumed) + report.capstdout + report.capstderr}
    if report.failed:
        detail['detail'] = str(report.longrepr)
    output = Path(os.environ['COJUDGE_PYTEST_DETAILS'])
    try:
        results = json.loads(output.read_text())
    except (FileNotFoundError, ValueError):
        results = {}
    results[item.name] = detail
    output.write_text(json.dumps(results))
'''

    def run(self, *args, **kwargs):
        original_subprocess = subprocess.run
        def run_pytest(command, *call_args, **options):
            if not isinstance(command, (list, tuple)) or '-m' not in command or 'pytest' not in command:
                return original_subprocess(command, *call_args, **options)
            with tempfile.TemporaryDirectory(prefix='cojudge-details-') as folder:
                location = Path(folder)
                (location / 'cojudge_pytest_details.py').write_text(plugin)
                env = dict(options.get('env') or os.environ)
                env['COJUDGE_PYTEST_DETAILS'] = str(location / 'details.json')
                env['PYTHONPATH'] = folder + os.pathsep + env.get('PYTHONPATH', '')
                options['env'] = env
                command = list(command) + ['-p', 'cojudge_pytest_details', '--tb=long']
                result = original_subprocess(command, *call_args, **options)
                if (location / 'details.json').exists():
                    diagnostics.update(json.loads((location / 'details.json').read_text()))
                return result
        subprocess.run = run_pytest
        try:
            result = original_run(self, *args, **kwargs)
        finally:
            subprocess.run = original_subprocess
        target = json.loads(args[0]).get('test') if args and isinstance(args[0], str) else None
        data = diagnostics.get(target) if target else next(iter(diagnostics.values()), None)
        if data is None:
            data = {'actual': result.replace(' | ', '\n'), 'expected': 'Complete all checks in the test', 'logs': '',
                'testDetails': {'title': target or 'Test', 'code': getattr(module, '_FA_TESTS', getattr(module, '_SM_TESTS', ''))}}
            if result != 'passed':
                data['detail'] = result.replace(' | ', '\n')
        print(':::PYTHON_TEST:::' + json.dumps(data))
        return result
    module.Solution.run = run
`;

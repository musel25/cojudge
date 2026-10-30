import { pythonPytestDiagnostics } from './pythonPytestDiagnostics';
import { pythonValueDisplay } from './pythonValueDisplay';

// Instrument the supplied exercise runner in memory. Saved editor code stays intact.
const assertionSupport = pythonValueDisplay + String.raw`
def _cojudge_enable_assertion_values(module):
    import ast
    import json
    import sys
    import types
    import __future__
    future_mask = 0
    for feature in __future__.all_feature_names:
        future_mask |= getattr(__future__, feature).compiler_flag
    tests = getattr(module, '_PB_TESTS', None)
    report = getattr(module, '_report', None)
    module_name = getattr(module, '_PB_MODULE', None)
    testing_tests = isinstance(getattr(module, '_PT_TARGET', None), str)
    if testing_tests:
        from pathlib import Path
        text = Path(module.__file__).read_text()
        if '# === WRITE YOUR TESTS BELOW ===' not in text:
            return
        tests = text.split('# === WRITE YOUR TESTS BELOW ===', 1)[1].split('# === END YOUR TESTS ===', 1)[0]
        module_name = getattr(module, '_PT_MODULE', None)
    if not isinstance(tests, str) or not isinstance(module_name, str) or not callable(report):
        return
    test_file = 'learner_tests.py' if testing_tests else 'test_' + module_name + '.py'
    original_compile = module.__dict__.get('compile', compile)
    try:
        tree = ast.parse(tests, test_file)
    except SyntaxError:
        return
    # Use names that cannot collide with names in the supplied tests.
    prefix = '_cojudge_assert_'
    identifiers = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    identifiers.update(n.arg for n in ast.walk(tree) if isinstance(n, ast.arg))
    while any(name.startswith(prefix) for name in identifiers):
        prefix += '_'
    captures = []
    active = prefix + 'active'
    calls = []
    call_sequence = 0
    failed_context = []
    assertions = []
    console = []
    consumed_console = []
    helper_module = types.ModuleType('_cojudge_test_diagnostics')
    sys.modules[helper_module.__name__] = helper_module

    def source_for(test_id):
        name = test_id.split('[', 1)[0].rsplit('.', 1)[-1]
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
                return ast.get_source_segment(tests, node) or tests
        return tests[:8000]

    def display(value):
        return _cojudge_display_value(value)

    def call(label, function, /, *args, **kwargs):
        nonlocal call_sequence
        # Save arguments before a learner function can mutate them.
        invocation = label + '(' + ', '.join(
            [display(value) for value in args] + [key + '=' + display(value) for key, value in kwargs.items()]) + ')'
        call_sequence += 1
        record = {'call': invocation, 'sequence': call_sequence}
        calls.append(record)
        del calls[:-30]
        try:
            result = function(*args, **kwargs)
        except BaseException as error:
            record['error'] = type(error).__name__ + ': ' + display(BaseException.args.__get__(error))
            raise
        record['returned'] = display(result)
        return result

    class Raises:
        def __init__(self, context, expected):
            self.context, self.expected = context, expected

        def __enter__(self):
            self.start = call_sequence
            return self.context.__enter__()

        def __exit__(self, kind, error, tb):
            try:
                handled = self.context.__exit__(kind, error, tb)
            except BaseException as context_error:
                failed_context[:] = [(context_error, self.expected, kind, error, [c for c in calls if c['sequence'] > self.start])]
                raise
            if kind is not None and not handled:
                failed_context[:] = [(error, self.expected, kind, error, [c for c in calls if c['sequence'] > self.start])]
            elif handled:
                failed_context.clear()
                assertions[:] = [(type(error).__name__ + ': ' + display(BaseException.args.__get__(error)), 'Raise ' + self.expected)]
            return handled

    helper_module.call = call
    helper_module.raises = Raises
    def note(actual, expected, equality):
        assertions[:] = [(display(actual), display(expected) if equality else expected)]
    helper_module.note = note

    class CaptureEquality(ast.NodeTransformer):
        in_function = False

        def visit_FunctionDef(self, node):
            previous, self.in_function = self.in_function, True
            node.body = [item for statement in node.body for item in self.statements(statement)]
            self.in_function = previous
            return node

        def statements(self, node):
            result = self.visit(node)
            return result if isinstance(result, list) else [result]

        def visit_Call(self, node):
            label = ast.get_source_segment(tests, node.func) or '<call>'
            node = self.generic_visit(node)
            # These builtins inspect the caller frame. Keep that frame intact.
            if not self.in_function or label in ('super', 'locals', 'globals', 'vars', 'dir', 'eval', 'exec') or label.endswith('raises'):
                return node
            return ast.copy_location(ast.Call(func=ast.Name(id=prefix + 'call', ctx=ast.Load()),
                args=[ast.Constant(label), node.func] + node.args, keywords=node.keywords), node)

        def visit_With(self, node):
            for item in node.items:
                context = item.context_expr
                if isinstance(context, ast.Call) and context.args and (
                        isinstance(context.func, ast.Attribute) and context.func.attr == 'raises' or
                        isinstance(context.func, ast.Name) and context.func.id == 'raises'):
                    expected = ast.get_source_segment(tests, context.args[0]) or 'the expected exception'
                    for keyword in context.keywords:
                        if keyword.arg == 'match':
                            expected += ' matching ' + (ast.get_source_segment(tests, keyword.value) or 'the required message')
                    item.context_expr = ast.copy_location(ast.Call(
                        func=ast.Name(id=prefix + 'raises', ctx=ast.Load()),
                        args=[context, ast.Constant(expected)], keywords=[]), context)
            return self.generic_visit(node)

        def visit_Assert(self, node):
            condition = ast.get_source_segment(tests, node.test) or 'The assertion'
            node = self.generic_visit(node)
            clear = ast.copy_location(ast.Assign(targets=[ast.Name(id=active, ctx=ast.Store())], value=ast.Constant(None)), node)
            comparison = node.test
            equality = isinstance(comparison, ast.Compare) and len(comparison.ops) == 1 and isinstance(comparison.ops[0], ast.Eq)
            left = prefix + str(len(captures)) + '_actual'
            right = prefix + str(len(captures)) + '_expected'
            captures.append((node.lineno, node.end_lineno, left, right, equality))
            actual = ast.Assign(targets=[ast.Name(id=left, ctx=ast.Store())], value=comparison.left if equality else comparison)
            expected = ast.Assign(targets=[ast.Name(id=right, ctx=ast.Store())], value=comparison.comparators[0] if equality else ast.Constant(condition + ' must be true'))
            selected = ast.Assign(targets=[ast.Name(id=active, ctx=ast.Store())], value=ast.Constant(len(captures) - 1))
            noted = ast.Expr(value=ast.Call(func=ast.Name(id=prefix + 'note', ctx=ast.Load()), args=[
                ast.Name(id=left, ctx=ast.Load()), ast.Name(id=right, ctx=ast.Load()), ast.Constant(equality)], keywords=[]))
            if equality:
                comparison.left = ast.copy_location(ast.Name(id=left, ctx=ast.Load()), comparison.left)
                comparison.comparators[0] = ast.copy_location(ast.Name(id=right, ctx=ast.Load()), comparison.comparators[0])
            else:
                node.test = ast.copy_location(ast.Name(id=left, ctx=ast.Load()), comparison)
            return [clear, ast.copy_location(actual, node), ast.copy_location(expected, node), ast.copy_location(noted, node), ast.copy_location(selected, node), node, clear]

    tree = CaptureEquality().visit(tree)
    imports = ast.ImportFrom(module=helper_module.__name__, names=[
        ast.alias(name='call', asname=prefix + 'call'), ast.alias(name='raises', asname=prefix + 'raises'),
        ast.alias(name='note', asname=prefix + 'note')], level=0)
    position = 0
    while position < len(tree.body) and (isinstance(tree.body[position], ast.ImportFrom) and tree.body[position].module == '__future__' or
            isinstance(tree.body[position], ast.Expr) and isinstance(tree.body[position].value, ast.Constant) and isinstance(tree.body[position].value.value, str)):
        position += 1
    tree.body.insert(position, imports)
    tree = ast.fix_missing_locations(tree)

    def compile_tests(source, filename, mode, *args, **kwargs):
        if isinstance(source, str) and source == tests and filename == test_file and mode == 'exec' and not args and not kwargs:
            flags = sys._getframe(1).f_code.co_flags & future_mask
            return original_compile(tree, filename, mode, flags=flags, dont_inherit=True)
        return original_compile(source, filename, mode, *args, **kwargs)

    def report_values(test_id, error, filename):
        detail = report(test_id, error, filename)
        if filename != test_file:
            return detail
        tb = error.__traceback__
        failed = None
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == test_file:
                failed = tb
            tb = tb.tb_next
        actual = type(error).__name__ + ': ' + str(error)
        expected = 'Complete the test without an unexpected exception'
        if failed is not None and isinstance(error, AssertionError):
            for index, (start, end, left, right, equality) in enumerate(captures):
                values = failed.tb_frame.f_locals
                if values.get(active) == index and start <= failed.tb_lineno <= end and left in values and right in values:
                    actual = display(values[left])
                    expected = display(values[right]) if equality else values[right]
        if failed_context and failed_context[-1][0] is error:
            _, exception, kind, raised, body_calls = failed_context[-1]
            expected = 'Raise ' + exception
            if kind is None:
                returned = next((c['returned'] for c in reversed(body_calls) if 'returned' in c), None)
                actual = ('Returned ' + returned + '; no exception was raised') if returned is not None else 'No exception was raised'
            else:
                actual = type(raised).__name__ + ': ' + str(raised)
        lines = []
        if failed is not None:
            lines.append('Test code:\n' + source_for(test_id))
            values = failed.tb_frame.f_locals
            inputs = [name + ' = ' + display(value) for name, value in values.items()
                if not name.startswith(prefix) and not name.startswith('__') and not isinstance(value, (types.ModuleType, types.FunctionType, type))]
            if inputs:
                lines.append('Test values:\n' + '\n'.join(inputs[:20]))
        if calls:
            lines.append('Calls:\n' + '\n'.join(c['call'] + (' -> raised ' + c['error'] if 'error' in c else ' -> ' + c.get('returned', '<not returned>')) for c in calls))
        return ':::ASSERTION:::' + json.dumps({
            'actual': actual, 'expected': expected, 'detail': detail,
            'testDetails': {'title': test_id, 'code': '\n\n'.join(lines)},
        })

    module.compile = compile_tests
    module._report = report_values
    capture_class = getattr(module, '_CapSys', None)
    if isinstance(capture_class, type) and hasattr(capture_class, 'readouterr'):
        original_read = capture_class.readouterr
        def readouterr(self):
            captured = original_read(self)
            consumed_console.append(captured.out + captured.err)
            return captured
        capture_class.readouterr = readouterr
    original_call = getattr(module, '_call', None)
    if callable(original_call):
        def run_test(function, *args, **kwargs):
            is_test = function.__name__.startswith('test')
            if is_test:
                calls.clear()
                failed_context.clear()
                assertions.clear()
                console.clear()
                consumed_console.clear()
            try:
                return original_call(function, *args, **kwargs)
            finally:
                if is_test:
                    remaining = args[2].getvalue() if len(args) > 2 and hasattr(args[2], 'getvalue') else ''
                    stderr = getattr(module, '_PT_STDERR', None)
                    console[:] = [(''.join(consumed_console) + remaining + (stderr.getvalue() if hasattr(stderr, 'getvalue') else ''))[:8000]]
        module._call = run_test
    original_grade = getattr(module, '_pt_grade', None)
    if testing_tests and callable(original_grade):
        def grade(source, case):
            result = original_grade(source, case)
            data = None
            if ':::ASSERTION:::' in result:
                try:
                    data = json.loads(result.split(':::ASSERTION:::', 1)[1])
                except ValueError:
                    pass
            if data is None:
                baseline = case == 'baseline'
                expected = ('Your tests must pass against the correct implementation with at least 90% statement coverage'
                    if baseline else 'Your tests must fail against the faulty implementation: ' + case)
                actual = ('All checks completed successfully' if result == 'passed' else result.replace(' | ', '\n'))
                mutant = next((item['source'] for item in module._PT_MUTANTS if item['name'] == case), module._PT_TARGET)
                data = {'actual': actual, 'expected': expected,
                    'testDetails': {'title': case, 'code': 'Implementation under test:\n' + mutant + '\n\nYour tests:\n' + source}}
            data['logs'] = ''.join(console)
            print(':::PYTHON_TEST:::' + json.dumps(data))
            return result
        module._pt_grade = grade
    original_solve = getattr(module, 'solve', None)
    if callable(original_solve):
        def solve(*args, **kwargs):
            result = original_solve(*args, **kwargs)
            data = {'logs': ''.join(console)}
            if result == 'passed':
                actual, expected = assertions[-1] if assertions else ('Test completed without an unexpected exception', 'Complete all checks in the test')
                if calls and not assertions:
                    actual = '\n'.join(c['call'] + (' -> raised ' + c['error'] if 'error' in c else ' -> ' + c.get('returned', '<not returned>')) for c in calls)
                target = args[0].get('test', 'Test') if args and isinstance(args[0], dict) else 'Test'
                data.update(actual=actual, expected=expected, testDetails={'title': target,
                    'code': source_for(target) + '\n\nCalls:\n' + '\n'.join(c['call'] + (' -> raised ' + c['error'] if 'error' in c else ' -> ' + c.get('returned', '<not returned>')) for c in calls)})
            elif isinstance(result, str) and not result.startswith(':::ASSERTION:::'):
                target = args[0].get('test', 'Test') if args and isinstance(args[0], dict) else 'Test'
                data.update(actual=result.replace(' | ', '\n'), expected='Complete the test without an unexpected exception',
                    detail=result.replace(' | ', '\n'), testDetails={'title': target, 'code': source_for(target)})
            # This line is outside the course's captured stdout. The verdict stays unchanged.
            print(':::PYTHON_TEST:::' + json.dumps(data))
            return result
        module.solve = solve
`;

export function withPythonExerciseAssertions(runner: string): string {
    const solutionImport = '    from Solution import Solution';
    if (!runner.includes(solutionImport)) return runner;
    return assertionSupport + '\n' + pythonPytestDiagnostics + '\n' + runner.replace(solutionImport,
        '    import Solution as _cojudge_solution\n' +
        '    _cojudge_enable_assertion_values(_cojudge_solution)\n' +
        '    _cojudge_enable_pytest_values(_cojudge_solution)\n' + solutionImport);
}

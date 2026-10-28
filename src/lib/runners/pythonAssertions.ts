// Instrument the supplied exercise runner in memory. Saved editor code stays intact.
const assertionSupport = String.raw`
def _cojudge_enable_assertion_values(module):
    import ast
    import json
    import sys
    import __future__
    future_mask = 0
    for feature in __future__.all_feature_names:
        future_mask |= getattr(__future__, feature).compiler_flag
    tests = getattr(module, '_PB_TESTS', None)
    report = getattr(module, '_report', None)
    module_name = getattr(module, '_PB_MODULE', None)
    if not isinstance(tests, str) or not isinstance(module_name, str) or not callable(report):
        return
    test_file = 'test_' + module_name + '.py'
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

    class CaptureEquality(ast.NodeTransformer):
        def visit_Assert(self, node):
            clear = ast.copy_location(ast.Assign(targets=[ast.Name(id=active, ctx=ast.Store())], value=ast.Constant(None)), node)
            comparison = node.test
            if not (isinstance(comparison, ast.Compare) and len(comparison.ops) == 1
                    and isinstance(comparison.ops[0], ast.Eq)):
                return [clear, node]
            left = prefix + str(len(captures)) + '_actual'
            right = prefix + str(len(captures)) + '_expected'
            captures.append((node.lineno, node.end_lineno, left, right))
            actual = ast.Assign(targets=[ast.Name(id=left, ctx=ast.Store())], value=comparison.left)
            expected = ast.Assign(targets=[ast.Name(id=right, ctx=ast.Store())], value=comparison.comparators[0])
            selected = ast.Assign(targets=[ast.Name(id=active, ctx=ast.Store())], value=ast.Constant(len(captures) - 1))
            comparison.left = ast.copy_location(ast.Name(id=left, ctx=ast.Load()), comparison.left)
            comparison.comparators[0] = ast.copy_location(ast.Name(id=right, ctx=ast.Load()), comparison.comparators[0])
            return [clear, ast.copy_location(actual, node), ast.copy_location(expected, node), ast.copy_location(selected, node), node]

    tree = ast.fix_missing_locations(CaptureEquality().visit(tree))

    def compile_tests(source, filename, mode, *args, **kwargs):
        if isinstance(source, str) and source == tests and filename == test_file and mode == 'exec' and not args and not kwargs:
            flags = sys._getframe(1).f_code.co_flags & future_mask
            return original_compile(tree, filename, mode, flags=flags, dont_inherit=True)
        return original_compile(source, filename, mode, *args, **kwargs)

    def display(value):
        try:
            result = repr(value)
            return result if len(result) <= 8000 else result[:8000] + '... (truncated)'
        except Exception:
            return '<value could not be displayed>'

    def report_values(test_id, error, filename):
        detail = report(test_id, error, filename)
        if not isinstance(error, AssertionError) or filename != test_file:
            return detail
        tb = error.__traceback__
        failed = None
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == test_file:
                failed = tb
            tb = tb.tb_next
        if failed is not None:
            for index, (start, end, left, right) in enumerate(captures):
                values = failed.tb_frame.f_locals
                if values.get(active) == index and start <= failed.tb_lineno <= end and left in values and right in values:
                    return ':::ASSERTION:::' + json.dumps({
                        'actual': display(values[left]), 'expected': display(values[right]), 'detail': detail,
                    })
        return detail

    module.compile = compile_tests
    module._report = report_values
`;

export function withPythonExerciseAssertions(runner: string): string {
    const solutionImport = '    from Solution import Solution';
    if (!runner.includes(solutionImport)) return runner;
    return assertionSupport + '\n' + runner.replace(solutionImport,
        '    import Solution as _cojudge_solution\n' +
        '    _cojudge_enable_assertion_values(_cojudge_solution)\n' + solutionImport);
}

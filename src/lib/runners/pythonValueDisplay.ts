// Never call learner __repr__ methods while tests are still running.
export const pythonValueDisplay = String.raw`
def _cojudge_display_value(value, depth=0):
    kind = type(value)
    try:
        if kind in (str, int, float, bool, complex, bytes, type(None)):
            text = repr(value)
        elif kind in (list, tuple, dict, set, frozenset) and depth < 4:
            from itertools import islice
            render = lambda item: _cojudge_display_value(item, depth + 1)
            if kind is dict:
                text = '{' + ', '.join(render(key) + ': ' + render(item) for key, item in islice(value.items(), 20)) + ('... (truncated)' if len(value) > 20 else '') + '}'
            else:
                parts = ', '.join(render(item) for item in islice(value, 20))
                if len(value) > 20:
                    parts += ', ... (truncated)'
                if kind is list:
                    text = '[' + parts + ']'
                elif kind is tuple:
                    text = '(' + parts + (',' if len(value) == 1 else '') + ')'
                else:
                    text = ('{' + parts + '}') if value else 'set()'
                    if kind is frozenset:
                        text = 'frozenset(' + text + ')'
        else:
            text = '<' + type.__getattribute__(kind, '__name__') + '>'
        return text if len(text) <= 2000 else text[:2000] + '... (truncated)'
    except Exception:
        return '<value could not be displayed>'
`;

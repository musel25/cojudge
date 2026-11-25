"""Run traces using learner code and return results for host-side grading."""
import base64
import json
import os
import subprocess
import sys
from types import ModuleType


def main():
    pieces = []
    for index in range(int(os.environ.pop("COJUDGE_ASSESSMENT_PARTS"))):
        pieces.append(os.environ.pop(f"COJUDGE_ASSESSMENT_{index}"))
    source, class_name, cases = json.loads(base64.b64decode("".join(pieces)))
    try:
        program = compile(source, "solution.py", "exec")
    except SyntaxError:
        return 20

    # Retain the result channel and discard learner diagnostics, including from
    # libraries that write directly to stdout or stderr file descriptors.
    result_fd = os.dup(1)
    with open(os.devnull, "wb") as discard:
        os.dup2(discard.fileno(), 1)
        os.dup2(discard.fileno(), 2)

    with os.fdopen(result_fd, "w", encoding="utf-8", errors="backslashreplace") as output:
        output.write("[")
        for case_index, operations in enumerate(cases):
            module = ModuleType("solution")
            sys.modules[module.__name__] = module
            try:
                exec(program, module.__dict__)
                instance = getattr(module, class_name)()
            except BaseException:
                return 21
            output.write(",[" if case_index else "[")
            for op_index, operation in enumerate(operations):
                if op_index:
                    output.write(",")
                try:
                    value = getattr(instance, operation["method"])(*operation["args"])
                    # Serialize immediately. Future operations can mutate the object.
                    encoded = json.dumps({"value": value}, allow_nan=False, ensure_ascii=False, separators=(",", ":"))
                except BaseException:
                    encoded = '{"error":true}'
                output.write(encoded)
            output.write("]")
        output.write("]")
    return 0


def supervise(seconds):
    # Start the same Python command without the timeout argument. The parent
    # can stop the child even if learner code blocks or installs signal handlers.
    try:
        result = subprocess.run(sys.orig_argv[:-1], timeout=seconds)
    except subprocess.TimeoutExpired:
        return 124
    except OSError:
        return 125
    return result.returncode if result.returncode in (0, 20) else 21


sys.exit(supervise(int(sys.argv[1])) if len(sys.argv) == 2 else main())

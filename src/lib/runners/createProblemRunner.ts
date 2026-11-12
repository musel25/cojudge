import type { ProgramRunner } from './ProgramRunner';
import { JavaRunner } from './JavaRunner';
import { PythonRunner } from './PythonRunner';
import { CppRunner } from './CppRunner';
import { CSharpRunner } from './CSharpRunner';
import { RustRunner } from './RustRunner';
import { GoRunner } from './GoRunner';
import { TypeScriptRunner } from './TypeScriptRunner';
import { PhpRunner } from './PhpRunner';

type ProblemRunnerConstructor = new (problemId: string, testCases: any[], code: string) => ProgramRunner;

const problemRunners = new Map<string, ProblemRunnerConstructor>([
    ['java', JavaRunner],
    ['python', PythonRunner],
    ['cpp', CppRunner],
    ['csharp', CSharpRunner],
    ['rust', RustRunner],
    ['go', GoRunner],
    ['typescript', TypeScriptRunner],
    ['php', PhpRunner]
]);

export function createProblemRunner(language: string, problemId: string, testCases: any[], code: string): ProgramRunner {
    const Runner = problemRunners.get(language);
    if (!Runner) throw new Error(`${language} is not supported yet`);
    return new Runner(problemId, testCases, code);
}

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getSubmit, POST as postSubmit } from '../../routes/api/submit/+server';
import { GET as getRun, POST as postRun } from '../../routes/api/run/+server';
import { JavaRunner } from '../runners/JavaRunner';
import { PythonRunner } from '../runners/PythonRunner';
import { CppRunner } from '../runners/CppRunner';
import { CSharpRunner } from '../runners/CSharpRunner';
import { RustRunner } from '../runners/RustRunner';
import { GoRunner } from '../runners/GoRunner';
import { PhpRunner } from '../runners/PhpRunner';
import { TypeScriptRunner } from '../runners/TypeScriptRunner';
import { RunnerCrashError } from '../runners/ProgramRunner';
import { POST as postDebug } from '../../routes/api/debug/+server';
import { GET as getAsset } from '../../routes/api/problems/[slug]/asset/[...path]/+server';

// Docker execution is external. Keep file loading, batching, parsing, and route responses real.
vi.mock('../markerRunner', () => ({
    getMarkerResponses: async (_id: string, _name: string, _params: unknown, cases: Record<string, unknown>[], outputs: string[]) =>
        cases.map((tc, i) => ({ actualAnswer: outputs[i], correctAnswer: tc.expected, isCorrect: outputs[i] === tc.expected }))
}));
vi.mock('./contentPaths', async (importOriginal) => ({
    ...await importOriginal<typeof import('./contentPaths')>(),
    // Seeding is unrelated to submission validation. Do not copy the bundled catalog into each fixture.
    ensureUserContentSeeded: async () => {}
}));

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const runners = [
    ['java', JavaRunner], ['python', PythonRunner], ['cpp', CppRunner],
    ['csharp', CSharpRunner], ['rust', RustRunner], ['go', GoRunner],
    ['typescript', TypeScriptRunner], ['php', PhpRunner]
] as const;
const problemId = 'judge-integrity-fixture';
let folder: string;
let problemFolder: string;

async function writeTests(content: unknown) {
    await fs.writeFile(path.join(problemFolder, 'official-tests.json'), JSON.stringify(content));
}

async function submit(startTcNo: unknown = 0, language = 'python') {
    const response = await postSubmit({ request: new Request('http://localhost/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, language, code: 'fixture code', startTcNo })
    }) } as Parameters<typeof postSubmit>[0]);
    const { jobId } = await response.json();
    return poll(getSubmit, jobId);
}

async function poll<T extends { url: URL }>(get: (event: T) => Response | Promise<Response>, jobId: string) {
    for (let attempt = 0; attempt < 200; attempt++) {
        const response = await get({ url: new URL(`http://localhost/api/job?jobId=${jobId}`) } as T);
        const body = await response.json();
        if (body.ready) return { response, body };
        await new Promise((resolve) => setTimeout(resolve, 1));
    }
    throw new Error('The fixture job did not complete');
}

beforeEach(async () => {
    folder = await fs.mkdtemp(path.join(os.tmpdir(), 'cojudge-judge-'));
    problemFolder = path.join(folder, 'problems', problemId);
    await fs.mkdir(problemFolder, { recursive: true });
    vi.stubEnv('COJUDGE_CONTENT_DIR', folder);
    await fs.writeFile(path.join(problemFolder, 'metadata.json'), JSON.stringify({
        functionName: 'solve', params: [{ name: 'input', type: 'string' }], outputType: 'string',
        testCases: [{ input: 'sample', expected: 'python:sample' }]
    }));
    await writeTests([{ input: 'official', expected: 'python:official' }]);
    for (const [language, Runner] of runners) {
        vi.spyOn(Runner.prototype, 'compile').mockResolvedValue(undefined);
        vi.spyOn(Runner.prototype, 'run').mockImplementation(async function (this: unknown) {
            const { testCases } = this as { testCases: Record<string, unknown>[] };
            return testCases.map((tc) => `:::RESULT:::${language}:${tc.input}\n`);
        });
    }
});

afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await fs.rm(folder, { recursive: true, force: true });
});

describe('submission integrity', () => {
    it('fails when official tests are missing instead of accepting sample tests', async () => {
        await fs.rm(path.join(problemFolder, 'official-tests.json'));
        const { response, body } = await submit();
        expect(response.status).toBe(400);
        expect(body.error).toContain('official-tests.json');
        expect(body.accepted).toBeUndefined();
    });

    it('fails when official tests contain corrupt JSON', async () => {
        await fs.writeFile(path.join(problemFolder, 'official-tests.json'), '[broken');
        const { response, body } = await submit();
        expect(response.status).toBe(400);
        expect(body.error).toContain('official-tests.json');
        expect(body.accepted).toBeUndefined();
    });

    it.each([[], {}, null, [null], [4], [[]], [{}], [{ input: 'first', _isLargeTest: true }, null], [{ input: 'x', _isLargeTest: 'yes' }]].map(content => ({ content })))(
        'rejects invalid official tests: $content', async ({ content }) => {
            await writeTests(content);
            const { response, body } = await submit();
            expect(response.status).toBe(400);
            expect(body.error).toContain('official-tests.json');
            expect(body.accepted).toBeUndefined();
            expect(body.allAccepted).toBeUndefined();
        }
    );

    it('fails when an official test generator cannot be evaluated', async () => {
        await writeTests([{ input: '@javascript:throw new Error("bad generator")', expected: 'python:throw new Error("bad generator")' }]);
        const { response, body } = await submit();
        expect(response.status).toBe(400);
        expect(body.error).toContain('official-tests.json');
        expect(body.accepted).toBeUndefined();
    });

    it.each([-1, 0.5, 'invalid', 'Infinity', {}, null, false, 2])('rejects invalid batch offset: %j', async (offset) => {
        const { response, body } = await submit(offset);
        expect(response.status).toBe(400);
        expect(body.error).toContain('startTcNo');
        expect(body.accepted).toBeUndefined();
        expect(body.allAccepted).toBeUndefined();
    });

    it('keeps the final completion request at exactly the official test count', async () => {
        const { response, body } = await submit(1);
        expect(response.status).toBe(200);
        expect(body).toMatchObject({ allAccepted: true, totalTc: 1, passedTc: 1, results: [] });
    });

    it('keeps large tests isolated and reports the size of each batch', async () => {
        await writeTests([
            { input: 'a', expected: 'python:a' }, { input: 'b', expected: 'python:b' },
            { input: 'large', expected: 'python:large', _isLargeTest: true },
            { input: 'd', expected: 'python:d' }
        ]);
        for (const [offset, inputs] of [[0, ['a', 'b']], [2, ['large']], [3, ['d']]] as const) {
            const { body } = await submit(offset);
            expect(body).toMatchObject({ accepted: true, totalTc: 4, passedTc: inputs.length });
            expect(body.results.map((tc: { input: string }) => tc.input)).toEqual(inputs);
        }
    });

    it('evaluates generated official inputs before execution', async () => {
        await writeTests([{ input: '@javascript:[1,2,3]', expected: 'python:[1,2,3]' }]);
        const { body } = await submit();
        expect(body).toMatchObject({ accepted: true, passedTc: 1, results: [{ input: '[1,2,3]', output: 'python:[1,2,3]' }] });
    });

    it('preserves the absolute index and input for a crash after completed tests', async () => {
        await writeTests([{ input: 'large', _isLargeTest: true }, { input: 'ok' }, { input: 'crash' }]);
        vi.spyOn(PythonRunner.prototype, 'run').mockRejectedValue(new RunnerCrashError('signal SIGSEGV', ':::RESULT:::ok\n---\n'));
        const { response, body } = await submit(1);
        expect(response.status).toBe(400);
        expect(body).toMatchObject({ errorTestIndex: 2, errorTestCase: { input: 'crash' } });
        expect(body.error).toContain('SIGSEGV');
    });
});

describe('problem runner selection', () => {
    it.each(runners)('uses %s for Run and Submit', async (language) => {
        const tc = { input: 'official', expected: `${language}:official` };
        await writeTests([tc]);
        const { body: submission } = await submit(0, language);
        expect(submission).toMatchObject({ accepted: true, results: [{ output: `${language}:official` }] });
        const response = await postRun({ request: new Request('http://localhost/api/run', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ problemId, language, code: 'fixture code', testCases: [tc] })
        }) } as Parameters<typeof postRun>[0]);
        const { jobId } = await response.json();
        const { body } = await poll(getRun, jobId);
        expect(body).toMatchObject({ results: [{ isCorrect: true, output: `${language}:official` }] });
    });

    it('keeps unsupported language errors', async () => {
        const { response, body } = await submit(0, 'unsupported');
        expect(response.status).toBe(400);
        expect(body.error).toContain('unsupported is not supported yet');
    });
});


describe('API responses', () => {
    it('returns a client error for an unknown debug action', async () => {
        const response = await postDebug({ request: new Request('http://localhost/api/debug', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: 'missing-session', action: 'unknown' })
        }) } as Parameters<typeof postDebug>[0]);
        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain("Invalid action 'unknown'");
    });

    it('serves binary assets without changing their bytes', async () => {
        await fs.writeFile(path.join(problemFolder, 'fixture.png'), Buffer.from([0, 127, 128, 255]));
        const response = await getAsset({ params: { slug: problemId, path: 'fixture.png' } } as Parameters<typeof getAsset>[0]);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('image/png');
        expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([0, 127, 128, 255]);
    });
});

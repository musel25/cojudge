import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import vm from 'vm';
import { ensureUserContentSeeded, resolveProblemFile } from '$lib/server/contentPaths';
import { getMarkerResponses } from '../../../lib/markerRunner';
import { presentAssertionResult } from '$lib/utils/assertionResult';
import { ProgramRunner } from '$lib/runners/ProgramRunner';
import { createProblemRunner } from '$lib/runners/createProblemRunner';
import { TIMEOUT_MESSAGE, annotateCrashSignal, type JobStatus } from '$lib/utils/util';

type SubmitResult = {
    accepted?: boolean;
    allAccepted?: boolean;
    totalTc?: number;
    passedTc?: number;
    results?: any[];
};
type SubmitJob = {
    id: string;
    status: JobStatus;
    createdAt: number;
    result?: SubmitResult;
    timeout?: boolean;
    timeoutTestCase?: any;
    error?: string;
    errorTestCase?: any;
    /** Absolute 0-based index (across all official tests) of the test that crashed. */
    errorTestIndex?: number;
    executionTimeMs?: number;
    memoryKB?: number;
};

const jobs: Map<string, SubmitJob> = new Map();

function genId() {
    const g: any = globalThis as any;
    if (g.crypto && typeof g.crypto.randomUUID === 'function') return g.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isJavaLanguage(language: string): boolean {
    return language === 'java';
}

async function executeSubmit(problemId: string, language: string, code: string, startTcNo: unknown, job: SubmitJob) {
    let batchStart = 0;
    let timeoutTestcase: any = null;
    let batchTestCases: any[] = [];
    try {
        job.status = 'running';
        const offset = startTcNo === undefined ? 0 : startTcNo;
        if ((typeof offset !== 'number' && typeof offset !== 'string') ||
            (typeof offset === 'string' && offset.trim() === '') ||
            !Number.isSafeInteger(Number(offset)) || Number(offset) < 0) {
            throw new Error('startTcNo must be a non-negative integer');
        }
        batchStart = Number(offset);
        await ensureUserContentSeeded();

        const problemPath = await resolveProblemFile(problemId, 'metadata.json');
        const problemContent = await fs.readFile(problemPath, 'utf-8');
        const problemData = JSON.parse(problemContent);

        const officialTestsPath = await resolveProblemFile(problemId, 'official-tests.json');
        let officialTests: any[];
        try {
            officialTests = JSON.parse(await fs.readFile(officialTestsPath, 'utf-8'));
            if (!Array.isArray(officialTests) || officialTests.length === 0) {
                throw new Error('Expected a non-empty array of test case objects');
            }
            for (const [index, tc] of officialTests.entries()) {
                if (!tc || typeof tc !== 'object' || Array.isArray(tc) ||
                    ('_isLargeTest' in tc && typeof tc._isLargeTest !== 'boolean') ||
                    (problemData.scriptMode !== true && (problemData.params ?? []).some(
                        (param: { name: string }) => !Object.hasOwn(tc, param.name)
                    ))) {
                    throw new Error(`Invalid test case at index ${index}`);
                }
            }
        } catch (error) {
            throw new Error(`Cannot load official-tests.json: ${error instanceof Error ? error.message : String(error)}`);
        }
        const totalTc = officialTests.length;
        if (batchStart > totalTc) {
            throw new Error('startTcNo exceeds the official test count');
        }
        // The client requests this exact offset after every batch passes.
        if (batchStart === totalTc) {
            job.result = { allAccepted: true, totalTc, passedTc: totalTc, results: [] };
            job.status = 'completed';
            return;
        }
        let tcNo = batchStart;
        const testCases = [officialTests[tcNo]];
        timeoutTestcase = testCases[0];
        while (!officialTests[tcNo]._isLargeTest && tcNo + 1 < totalTc && !officialTests[tcNo + 1]._isLargeTest) {
            testCases.push(officialTests[++tcNo]);
        }
        batchTestCases = testCases;
        const JAVASCRIPT_PREFIX = '@javascript:';
        for (const [index, tc] of testCases.entries()) {
            for (const key of Object.keys(tc)) {
                const value = tc[key];
                if (typeof value !== 'string' || !value.startsWith(JAVASCRIPT_PREFIX)) continue;
                try {
                    const evaluated = vm.runInNewContext(value.slice(JAVASCRIPT_PREFIX.length), {}, { timeout: 2000 });
                    tc[key] = typeof evaluated === 'string' ? evaluated
                        : typeof evaluated === 'object' ? JSON.stringify(evaluated) : String(evaluated);
                } catch (error) {
                    throw new Error(`Cannot process official-tests.json test ${batchStart + index}, field ${key}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        const programRunner = createProblemRunner(language, problemId, testCases, code);
        await programRunner.compile();
        const rawResults = await programRunner.run();
        if (programRunner.lastRunMetrics) {
            job.executionTimeMs = programRunner.lastRunMetrics.executionTimeMs;
            job.memoryKB = programRunner.lastRunMetrics.memoryKB;
        }

        const hasMergedMarker = isJavaLanguage(language) &&
            rawResults.length > 0 &&
            rawResults[0].includes(':::VERDICT:::');

        let markerResponses: any[];
        const parsed: any[] = [];
        if (hasMergedMarker) {
            markerResponses = rawResults.map((chunk) => {
                const lines = (chunk || '').split('\n');
                const errorLine = lines.find((l) => l.startsWith(':::ERROR:::'));
                if (errorLine) {
                    const errMsg = errorLine.slice(':::ERROR:::'.length).trim();
                    parsed.push({ output: errMsg, error: true });
                    return {
                        actualAnswer: errMsg,
                        isCorrect: false,
                        correctAnswer: '',
                        logs: errMsg
                    };
                }
                const resultLine = lines.find((l) => l.startsWith(':::RESULT:::'));
                const verdictLine = lines.find((l) => l.startsWith(':::VERDICT:::'));
                const answerLine = lines.find((l) => l.startsWith(':::ANSWER:::'));
                parsed.push({ output: resultLine?.slice(':::RESULT:::'.length).trim() ?? '', error: false });
                return {
                    actualAnswer: resultLine ? resultLine.slice(':::RESULT:::'.length).trim() : '',
                    isCorrect: verdictLine ? verdictLine.slice(':::VERDICT:::'.length).trim() === 'true' : false,
                    correctAnswer: answerLine ? answerLine.slice(':::ANSWER:::'.length).trim() : '',
                    logs: lines
                        .filter((l) =>
                            !l.startsWith(':::RESULT:::') &&
                            !l.startsWith(':::VERDICT:::') &&
                            !l.startsWith(':::ANSWER:::') &&
                            !l.startsWith(':::ERROR:::')
                        )
                        .filter((l) => l.trim().length > 0)
                        .join('\n')
                };
            });
        } else {
            const parsedResults = rawResults.map((chunk) => {
                try {
                    const lines = (chunk || '').split('\n');
                    const errorLine = lines.find((l) => l.startsWith(':::ERROR:::'));
                    if (errorLine) {
                        const errMsg = errorLine.slice(':::ERROR:::'.length).trim();
                        return { output: errMsg, logs: errMsg, error: true };
                    }
                    const idx = lines.findIndex((l) => l.startsWith(':::RESULT:::'));
                    if (idx === -1) {
                        return { output: (chunk || '').trim(), logs: '' };
                    }
                    // NOTE: multiline-safe (see api/run): the value may span lines.
                    // Only the trailing empty artifact is dropped; all other
                    // whitespace is significant (e.g. whitespace-only strings).
                    const rawParts = [lines[idx].slice(':::RESULT:::'.length), ...lines.slice(idx + 1)];
                    if (rawParts.length > 0 && rawParts[rawParts.length - 1] === '') rawParts.pop();
                    const output = rawParts.join('\n');
                    const logs = lines
                        .filter((_, i) => i < idx)
                        .filter((l) => l.trim().length > 0)
                        .join('\n');
                    return { output, logs };
                } catch {
                    return { output: (chunk || '').trim(), logs: '' };
                }
            });
            parsed.push(...parsedResults);
            const onlyOutputs = parsed.map((p) => p.output);
            const markerOutputs = onlyOutputs.map((o, i) => {
                if (parsed[i]?.error) {
                    const tc = testCases[i];
                    return tc.adjList || tc.input || '[]';
                }
                return o;
            });
            try {
                markerResponses = await getMarkerResponses(
                    problemId,
                    problemData.functionName,
                    problemData.params,
                    testCases,
                    markerOutputs,
                    problemData.outputType
                );
            } catch (e) {
                markerResponses = testCases.map((_, i) => ({
                    actualAnswer: parsed[i]?.output ?? '',
                    correctAnswer: parsed[i]?.output ?? '',
                    isCorrect: false,
                    logs: e instanceof Error ? e.message : String(e)
                }));
            }
            markerResponses = markerResponses.map((mr, i) => ({
                ...mr,
                isCorrect: parsed[i]?.error ? false : mr.isCorrect,
                logs: parsed[i]?.logs ?? ''
            }));
        }

        const finalResponse = testCases.map((tc, index) => presentAssertionResult({
            ...tc,
            output: parsed[index]?.error ? parsed[index].output : ((markerResponses[index] as any)?.actualAnswer ?? markerResponses[index]?.output ?? 'No output'),
            logs: markerResponses[index]?.logs ?? '',
            isCorrect: markerResponses[index].isCorrect,
            correctAnswer: markerResponses[index].correctAnswer,
            error: null
        }));
        const accepted = markerResponses.every((m: any) => m.isCorrect);
        job.result = { accepted, totalTc, passedTc: (job.result?.passedTc ? job.result?.passedTc : 0) + testCases.length, results: finalResponse };
        job.status = 'completed';
    } catch (error: any) {
        if (error && error.toString() && error.toString().indexOf(TIMEOUT_MESSAGE) !== -1) {
            job.timeout = true;
            job.timeoutTestCase = timeoutTestcase;
            job.status = 'completed';
        } else {
            // A crash (e.g. SIGSEGV) kills the whole batch container, but the
            // tests before the crash already printed their `---`-delimited
            // chunks (runners flush per test). Count them to blame the test
            // that actually crashed instead of the batch start.
            const partial = ProgramRunner.crashStdout(error);
            let crashIndex = 0;
            if (partial !== null && batchTestCases.length > 0) {
                crashIndex = Math.min(
                    Math.max(ProgramRunner.countCompletedChunks(partial), 0),
                    batchTestCases.length - 1
                );
            }
            job.error = `Submission failed: details: ${annotateCrashSignal(error.message || error)}`;
            job.errorTestCase = batchTestCases[crashIndex];
            job.errorTestIndex = batchStart + crashIndex;
            job.status = 'error';
        }
    }
}

export const POST: RequestHandler = async ({ request }) => {
    const { problemId, language, code, startTcNo } = await request.json();
    const id = genId();
    const job: SubmitJob = { id, status: 'pending', createdAt: Date.now() };
    jobs.set(id, job);
    executeSubmit(problemId, language, code, startTcNo, job);
    return json({ jobId: id });
};

export const GET: RequestHandler = async ({ url }) => {
    const jobId = url.searchParams.get('jobId') || '';
    const job = jobs.get(jobId);
    if (!job) return json({ error: 'Job not found' }, { status: 404 });
    if (job.status === 'pending' || job.status === 'running') {
        return json({ ready: false, status: job.status, passedTc: job.result?.passedTc });
    }
    if (job.timeout) {
        return json({ ready: true, timeout: true, timeoutTestCase: job.timeoutTestCase });
    }
    if (job.status === 'error') {
        return json({ ready: true, error: job.error || 'Submission failed', errorTestCase: job.errorTestCase, errorTestIndex: job.errorTestIndex }, { status: 400 });
    }
    return json({
        ready: true,
        ...(job.result || {}),
        executionTimeMs: job.executionTimeMs,
        memoryKB: job.memoryKB,
    });
};

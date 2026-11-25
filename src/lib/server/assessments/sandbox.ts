import { randomUUID } from 'node:crypto';
import { Readable, Writable } from 'node:stream';
import { finished } from 'node:stream/promises';
import Dockerode from 'dockerode';
import { cojudgeContainerLabels } from '$lib/server/containerSession';
import { pythonImage } from '$lib/utils/pythonUtil';
import { ensureImageAvailable } from '$lib/utils/util';
import harness from './pythonHarness.py?raw';
import type { Json } from './schema';

export type PythonInput = { method: string; args: Json[] }[][];
export type TraceOutput = ({ value: Json } | { error: true })[];
export type PythonResult = { status: 'ok'; traces: TraceOutput[] } | { status: 'syntax' | 'timeout' | 'runtime' };

const docker = new Dockerode({ timeout: 30_000 });
const cleanupDocker = new Dockerode({ timeout: 3_000 });
const maxInputBytes = 1024 * 1024;
const maxOutputBytes = 1024 * 1024;
const runtimeSeconds = 5;
const memoryBytes = 128 * 1024 * 1024;

function inputEnv(code: string, className: string, cases: PythonInput): string[] {
    const payload = JSON.stringify([code, className, cases]);
    if (Buffer.byteLength(payload) > maxInputBytes) {
        throw new Error('Python assessment exceeds the sandbox input limit');
    }
    // Keep each entry below Linux's per-string argument and environment limit.
    const parts = Buffer.from(payload).toString('base64').match(/.{1,65536}/g)!;
    return [
        `COJUDGE_ASSESSMENT_PARTS=${parts.length}`,
        ...parts.map((part, index) => `COJUDGE_ASSESSMENT_${index}=${part}`)
    ];
}

function isJson(value: unknown, depth = 0): value is Json {
    if (depth > 32) return false;
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every((item) => isJson(item, depth + 1));
    return !!value && typeof value === 'object' && Object.values(value).every((item) => isJson(item, depth + 1));
}

function isTraceStep(value: unknown): value is TraceOutput[number] {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 1) return false;
    return ('error' in value && value.error === true) || ('value' in value && isJson(value.value));
}

function parseOutput(output: Buffer[], cases: PythonInput): PythonResult {
    let result: unknown;
    try {
        result = JSON.parse(Buffer.concat(output).toString('utf8'));
    } catch {
        return { status: 'runtime' };
    }
    if (!Array.isArray(result) || result.length !== cases.length || !result.every((trace, index) =>
        Array.isArray(trace) && trace.length === cases[index].length && trace.every(isTraceStep)
    )) return { status: 'runtime' };
    return { status: 'ok', traces: result };
}

async function removeContainer(name: string) {
    try {
        await cleanupDocker.getContainer(name).remove({ force: true, v: true });
    } catch (error) {
        if (!(error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404)) throw error;
    }
}

export async function executePython(code: string, className: string, cases: PythonInput): Promise<PythonResult> {
    const env = inputEnv(code, className, cases);
    await ensureImageAvailable(docker, pythonImage);

    const name = `cojudge-assessment-${randomUUID()}`;
    const controller = new AbortController();
    const signal = controller.signal;
    let started = false;
    let stream: Readable | undefined;
    // Also enforce the limit inside the container if the Docker connection drops.
    const timer = setTimeout(() => controller.abort('timeout'), (runtimeSeconds + 2) * 1000);

    try {
        const container = await docker.createContainer({
            name,
            abortSignal: signal,
            Image: pythonImage,
            Env: env,
            Entrypoint: ['python3', '-I', '-S', '-B', '-c'],
            Cmd: [harness, String(runtimeSeconds)],
            User: '65534:65534',
            NetworkDisabled: true,
            WorkingDir: '/',
            Labels: cojudgeContainerLabels({ 'cojudge.assessment': 'true' }),
            HostConfig: {
                NetworkMode: 'none',
                ReadonlyRootfs: true,
                CapDrop: ['ALL'],
                SecurityOpt: ['no-new-privileges'],
                IpcMode: 'none',
                Memory: memoryBytes,
                MemorySwap: memoryBytes,
                NanoCpus: 1_000_000_000,
                PidsLimit: 32,
                LogConfig: { Type: 'none', Config: {} },
                Ulimits: [
                    { Name: 'core', Hard: 0, Soft: 0 },
                    { Name: 'nofile', Hard: 64, Soft: 64 }
                ]
            }
        });
        const attachment = await container.attach({ stdout: true, stderr: true, stream: true, abortSignal: signal });
        if (!(attachment instanceof Readable)) throw new Error('The Docker attachment is not readable');
        stream = attachment;
        const stdout: Buffer[] = [];
        let receivedBytes = 0;
        stream.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
            if (receivedBytes > maxOutputBytes) controller.abort('runtime');
        });
        docker.modem.demuxStream(stream, new Writable({
            write(chunk, _encoding, callback) {
                if (!signal.aborted) stdout.push(chunk);
                callback();
            }
        }), new Writable({ write(_chunk, _encoding, callback) { callback(); } }));
        const outputDone = finished(stream, { signal, cleanup: true });
        // Observe rejection immediately. The stream may close before start responds.
        void outputDone.catch(() => {});
        await container.start({ abortSignal: signal });
        started = true;
        const [exit] = await Promise.all([container.wait({ abortSignal: signal }), outputDone]);
        const status: unknown = exit.StatusCode;
        if (typeof status !== 'number' || status === 125 || status === 126 || status === 127 || exit.Error?.Message) {
            throw new Error('The Python sandbox could not run the assessment harness');
        }
        if (status === 20) return { status: 'syntax' };
        if (status === 124) return { status: 'timeout' };
        if (status !== 0) return { status: 'runtime' };
        return parseOutput(stdout, cases);
    } catch (error) {
        if (signal.reason === 'runtime') return { status: 'runtime' };
        if (signal.aborted && started) return { status: 'timeout' };
        throw error;
    } finally {
        clearTimeout(timer);
        stream?.destroy();
        await removeContainer(name);
    }
}

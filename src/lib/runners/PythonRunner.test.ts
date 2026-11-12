import { afterEach, describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import ContainerPool from './ContainerPool';
import { ProgramRunner } from './ProgramRunner';
import { PythonRunner } from './PythonRunner';

vi.mock('$lib/server/contentPaths', () => ({
    resolveProblemFile: async (slug: string, file: string) => join(process.cwd(), 'problems', slug, file)
}));

afterEach(() => { vi.restoreAllMocks(); });

describe('Python script runner preparation', () => {
    it('does not install external timing tools for script tasks', async () => {
        const container = {
            putArchive: vi.fn(async (archive: NodeJS.ReadableStream) => { archive.resume(); })
        };
        vi.spyOn(ContainerPool, 'acquire').mockResolvedValue(container as never);
        const install = vi.spyOn(ProgramRunner, 'ensureTimeInstalled').mockResolvedValue();

        const runner = new PythonRunner('pns-24-reverse-text', [{ input: 'cat' }], 'print("tac")');
        await runner.compile();

        expect(container.putArchive).toHaveBeenCalledOnce();
        expect(install).not.toHaveBeenCalled();
    });
});

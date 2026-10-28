import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPythonDependencies } from './pythonSupport';

describe('problem Python libraries', () => {
    it('makes a bundled library importable before learner code loads', async () => {
        const folder = await mkdtemp(path.join(tmpdir(), 'cojudge-python-libs-'));
        try {
            execFileSync('uv', ['run', '--no-project', '--python', '3.11', 'python', '-c',
                "import zipfile; z=zipfile.ZipFile('python-libs.zip','w'); z.writestr('course_library.py','value = 42'); z.close()"], { cwd: folder });
            const result = await withPythonDependencies('from course_library import value\nprint(value)\n', true,
                () => import('node:fs/promises').then(fs => fs.readFile(path.join(folder, 'python-libs.zip'))));
            await writeFile(path.join(folder, 'main.py'), result.code);
            expect(result.archive?.length).toBeGreaterThan(0);
            expect(execFileSync('uv', ['run', '--no-project', '--python', '3.11', 'python', 'main.py'],
                { cwd: folder, encoding: 'utf8' }).trim()).toBe('42');
        } finally { await rm(folder, { recursive: true, force: true }); }
    });

    it('does not load libraries for a normal problem', async () => {
        const result = await withPythonDependencies('print(7)', false, async () => { throw Error('unexpected read'); });
        expect(result).toEqual({ code: 'print(7)' });
    });

    it('rejects a missing required archive', async () => {
        await expect(withPythonDependencies('print(7)', true, async () => { throw Error('missing archive'); }))
            .rejects.toThrow('missing archive');
    });
});

import { describe, expect, it } from 'vitest';
import { executePython } from './sandbox';

const docker = describe.runIf(process.env.COJUDGE_TEST_ASSESSMENT_DOCKER === '1');

docker('Python assessment sandbox', () => {
    it('runs an independent implementation for each trace and preserves state within a trace', async () => {
        const code = `
class Counter:
    def __init__(self):
        self.total = 0

    def add(self, amount):
        print('learner output')
        self.total += amount
        return self.total
`;
        await expect(executePython(code, 'Counter', [
            [{ method: 'add', args: [2] }, { method: 'add', args: [3] }],
            [{ method: 'add', args: [1] }]
        ])).resolves.toEqual({ status: 'ok', traces: [[{ value: 2 }, { value: 5 }], [{ value: 1 }]] });
    }, 15_000);

    it('supports Python imports that resolve annotations through the solution module', async () => {
        const code = `
from __future__ import annotations
from dataclasses import dataclass

@dataclass
class Counter:
    total: int = 0

    def get(self):
        return self.total
`;
        await expect(executePython(code, 'Counter', [[{ method: 'get', args: [] }]]))
            .resolves.toEqual({ status: 'ok', traces: [[{ value: 0 }]] });
    }, 15_000);

    it('uses a non-root identity, a read-only root filesystem, and a loopback-only network', async () => {
        const code = `
import os
import socket

class Facts:
    def get(self):
        return [os.geteuid() != 0, bool(os.statvfs('/').f_flag & os.ST_RDONLY),
                sorted(name for _, name in socket.if_nameindex())]
`;
        await expect(executePython(code, 'Facts', [[{ method: 'get', args: [] }]]))
            .resolves.toEqual({ status: 'ok', traces: [[{ value: [true, true, ['lo']] }]] });
    }, 15_000);

    it('terminates a run that exceeds the wall limit', async () => {
        const code = `
class Counter:
    def add(self):
        while True:
            pass
`;
        await expect(executePython(code, 'Counter', [[{ method: 'add', args: [] }]]))
            .resolves.toEqual({ status: 'timeout' });
    }, 15_000);

    it('reports syntax failures and invalid return values without disclosing raw output', async () => {
        const cases = [[{ method: 'add', args: [] }]];
        await expect(executePython('def broken(!', 'Counter', cases)).resolves.toEqual({ status: 'syntax' });
        const code = `
class Counter:
    def add(self):
        return float('nan')
`;
        await expect(executePython(code, 'Counter', cases))
            .resolves.toEqual({ status: 'ok', traces: [[{ error: true }]] });
    }, 15_000);

    it('rejects results above the output limit', async () => {
        const code = `
class Counter:
    def get(self):
        return 'a' * (2 * 1024 * 1024)
`;
        await expect(executePython(code, 'Counter', [[{ method: 'get', args: [] }]]))
            .resolves.toEqual({ status: 'runtime' });
    }, 15_000);

    it('returns UTF-8 strings within the output limit', async () => {
        const code = `
class Counter:
    def get(self):
        return 'é' * 180000
`;
        const result = await executePython(code, 'Counter', [[{ method: 'get', args: [] }]]);
        expect(result.status).toBe('ok');
        if (result.status === 'ok') expect(result.traces[0][0]).toEqual({ value: 'é'.repeat(180000) });
    }, 15_000);
});

import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

describe('container session labels', () => {
    it('uses a separate label for isolated verification containers', async () => {
        vi.stubEnv('COJUDGE_ISOLATED_VERIFY', '1');
        vi.resetModules();
        const { cojudgeContainerLabels } = await import('./containerSession');
        expect(cojudgeContainerLabels()['cojudge.created']).toBe('verification');
    });

    it('keeps the regular label outside verification', async () => {
        vi.stubEnv('COJUDGE_ISOLATED_VERIFY', '');
        vi.resetModules();
        const { cojudgeContainerLabels } = await import('./containerSession');
        expect(cojudgeContainerLabels()['cojudge.created']).toBe('true');
    });

    it('gives containers from another session five minutes before orphan cleanup', async () => {
        vi.resetModules();
        const { cojudgeContainerLabels, orphanMaxAgeMs } = await import('./containerSession');
        expect(orphanMaxAgeMs(cojudgeContainerLabels(), 40_000)).toBe(40_000);
        expect(orphanMaxAgeMs({ 'cojudge.session': 'another-session' }, 40_000)).toBe(300_000);
    });
});

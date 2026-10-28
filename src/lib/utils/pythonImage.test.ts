import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

it('uses the configured Python image for judge, playground, and debug runners', async () => {
    vi.stubEnv('COJUDGE_PYTHON_IMAGE', 'cojudge-python:fastapi');
    vi.resetModules();
    const { pythonImage } = await import('./pythonUtil');
    expect(pythonImage).toBe('cojudge-python:fastapi');
});

it('keeps the standard Python image by default', async () => {
    vi.stubEnv('COJUDGE_PYTHON_IMAGE', '');
    vi.resetModules();
    const { pythonImage } = await import('./pythonUtil');
    expect(pythonImage).toBe('python:3.11-slim');
});

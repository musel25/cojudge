import { randomUUID } from 'node:crypto';
import process from 'node:process';

export const containerSessionId = process.env.COJUDGE_SESSION_ID || randomUUID();
export const containerCreatedLabel = process.env.COJUDGE_ISOLATED_VERIFY === '1' ? 'verification' : 'true';

export function orphanMaxAgeMs(labels: Record<string, string> | undefined, ownTimeoutMs: number): number {
    if (labels?.['cojudge.session'] !== containerSessionId || labels?.['cojudge.debug'] === 'true') {
        return 300_000;
    }
    return ownTimeoutMs;
}

export function cojudgeContainerLabels(extra: Record<string, string> = {}) {
    return {
        'cojudge.created': containerCreatedLabel,
        'cojudge.session': containerSessionId,
        ...extra
    };
}

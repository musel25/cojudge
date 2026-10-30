import type { TestCasePresentation } from './testCasePresentation';

export function presentAssertionResult<T extends { output?: unknown; isCorrect?: boolean; logs?: string }>(result: T): T & { failureDetail?: string; testDetails?: TestCasePresentation } {
    const prefix = ':::ASSERTION:::';
    const logPrefix = ':::PYTHON_TEST:::';
    const lines = result.logs?.split('\n') ?? [];
    const diagnostic = lines.find(line => line.startsWith(logPrefix));
    if (diagnostic) {
        try {
            const data = JSON.parse(diagnostic.slice(logPrefix.length));
            if (typeof data?.logs === 'string') {
                result = { ...result, logs: [...lines.filter(line => line !== diagnostic), data.logs].filter(Boolean).join('\n') };
                if (typeof data.actual === 'string' && typeof data.expected === 'string' &&
                    typeof data.testDetails?.title === 'string' && typeof data.testDetails?.code === 'string') {
                    return { ...result, output: data.actual, correctAnswer: data.expected, testDetails: data.testDetails,
                        ...(result.isCorrect === false && typeof data.detail === 'string' ? { failureDetail: data.detail } : {}) };
                }
            }
        } catch { /* Preserve malformed diagnostics as ordinary console output. */ }
    }
    if (result.isCorrect !== false || typeof result.output !== 'string' || !result.output.startsWith(prefix)) return result;
    try {
        const data = JSON.parse(result.output.slice(prefix.length));
        if (typeof data?.actual === 'string' && typeof data?.expected === 'string' && typeof data?.detail === 'string') {
            const testDetails = typeof data.testDetails?.title === 'string' && typeof data.testDetails?.code === 'string'
                ? { title: data.testDetails.title, code: data.testDetails.code } : undefined;
            return { ...result, output: data.actual, correctAnswer: data.expected, failureDetail: data.detail,
                ...(testDetails ? { testDetails } : {}) };
        }
    } catch { /* Keep ordinary output when the diagnostics are incomplete. */ }
    return result;
}

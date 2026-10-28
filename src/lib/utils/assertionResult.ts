export function presentAssertionResult<T extends { output?: unknown; isCorrect?: boolean }>(result: T): T & { failureDetail?: string } {
    const prefix = ':::ASSERTION:::';
    if (result.isCorrect !== false || typeof result.output !== 'string' || !result.output.startsWith(prefix)) return result;
    try {
        const data = JSON.parse(result.output.slice(prefix.length));
        if (typeof data?.actual === 'string' && typeof data?.expected === 'string' && typeof data?.detail === 'string') {
            return { ...result, output: data.actual, correctAnswer: data.expected, failureDetail: data.detail };
        }
    } catch { /* Keep ordinary output when the diagnostics are incomplete. */ }
    return result;
}

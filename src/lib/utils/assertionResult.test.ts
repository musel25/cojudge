import { describe, expect, it } from 'vitest';
import { presentAssertionResult } from './assertionResult';

describe('presentAssertionResult', () => {
    const encode = (data: unknown) => ':::ASSERTION:::' + JSON.stringify(data);
    it('presents compared values without changing the verdict or test inputs', () => {
        const result = { payload: '{"test":"test_bike"}', output: encode({ actual: "'wrong'", expected: "'right'", detail: 'FAILED test_bike' }), correctAnswer: 'passed', isCorrect: false, logs: 'printed' };
        expect(presentAssertionResult(result)).toEqual({ ...result, output: "'wrong'", correctAnswer: "'right'", failureDetail: 'FAILED test_bike' });
        expect(result.correctAnswer).toBe('passed');
    });
    it('keeps ordinary answers, passed results, and malformed diagnostics unchanged', () => {
        for (const output of ['passed', 'FAILED test_x | AssertionError', ':::ASSERTION:::{', encode(null), encode({ actual: 1, expected: 2, detail: 'bad' })]) {
            const result = { output, correctAnswer: 'passed', isCorrect: false };
            expect(presentAssertionResult(result)).toBe(result);
        }
        const passed = { output: encode({ actual: 'x', expected: 'y', detail: 'bad' }), isCorrect: true };
        expect(presentAssertionResult(passed)).toBe(passed);
    });
});

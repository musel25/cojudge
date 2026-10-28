import { describe, expect, it } from 'vitest';
import { getTestCasePresentation } from './testCasePresentation';

describe('getTestCasePresentation', () => {
    const detail = { title: 'Motorbike behavior', code: 'assert Motorbike("Yamaha", "R3", 2, 321).rev_engine() == "Yamaha R3 with 2 wheels goes Vroom vroom!"' };
    const problem = { testCaseDescriptions: { test_motorbike: detail, baseline: { title: 'Correct implementation', code: 'assert fibonacci(0) == 0' } } };

    it('resolves a supplied check without changing the judge input', () => {
        const input = { payload: '{"test":"test_motorbike"}' };
        expect(getTestCasePresentation(problem, input)).toEqual(detail);
        expect(input).toEqual({ payload: '{"test":"test_motorbike"}' });
    });

    it('supports a testing exercise check', () => {
        expect(getTestCasePresentation(problem, { payload: '{"check":"baseline"}' })?.code).toBe('assert fibonacci(0) == 0');
    });

    it('keeps ordinary and unknown custom inputs editable', () => {
        expect(getTestCasePresentation(problem, { nums: '[1,2,3]' })).toBeNull();
        expect(getTestCasePresentation(problem, { payload: '{"test":"my_custom_test"}' })).toBeNull();
        expect(getTestCasePresentation(problem, { payload: '{' })).toBeNull();
        expect(getTestCasePresentation({}, { payload: '{"test":"test_motorbike"}' })).toBeNull();
    });

    it('ignores invalid or inherited display entries', () => {
        expect(getTestCasePresentation({ testCaseDescriptions: { x: { title: 'x' } } }, { payload: '{"test":"x"}' })).toBeNull();
        expect(getTestCasePresentation({ testCaseDescriptions: Object.create({ x: detail }) }, { payload: '{"test":"x"}' })).toBeNull();
    });
});

import { describe, expect, it } from 'vitest';
import { completeSharedCode, inputCodeCharacter, pastedCodeCharacters } from './sharedCode';

describe('shared solution code entry', () => {
    it('keeps the last valid typed character without changing its case', () => {
        expect(inputCodeCharacter('aB!')).toBe('B');
        expect(inputCodeCharacter('x_7')).toBe('7');
        expect(inputCodeCharacter('!?')).toBe('');
    });
    it('takes the first four alphanumeric pasted characters and keeps case', () => {
        expect(pastedCodeCharacters(' A-b_3 4z ')).toBe('Ab34');
        expect(pastedCodeCharacters('Xy')).toBe('Xy');
        expect(pastedCodeCharacters('!@#')).toBe('');
    });
    it('navigates only for a complete four-character alphanumeric code', () => {
        expect(completeSharedCode(['a', 'B', '3', 'Z'])).toBe('aB3Z');
        expect(completeSharedCode(['a', '', '3', 'Z'])).toBeNull();
        expect(completeSharedCode(['a', '-', '3', 'Z'])).toBeNull();
        expect(completeSharedCode(['a', 'B', '3', 'Z', '5'])).toBeNull();
    });
});

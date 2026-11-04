import { describe, expect, it } from 'vitest';
import { createMarkdownFindPattern, historyMergeGroup, historyStateChars } from './markdownPolicies';

describe('Markdown document find', () => {
    it('treats literal punctuation as text and ignores case by default', () => {
        const pattern = createMarkdownFindPattern('a.b', false, false, false);
        expect('A.B a-b'.match(pattern!)).toEqual(['A.B']);
    });
    it('supports case-sensitive and whole-word searches', () => {
        const pattern = createMarkdownFindPattern('cat', true, false, true);
        expect('cat Cat scatter'.match(pattern!)).toEqual(['cat']);
    });
    it('uses raw expressions in regex mode and rejects invalid or empty expressions', () => {
        expect('abc 123'.match(createMarkdownFindPattern('\\d+', false, true, true)!)).toEqual(['123']);
        expect(createMarkdownFindPattern('[', false, true, false)).toBeNull();
        expect(createMarkdownFindPattern('', false, false, false)).toBeNull();
    });
});

describe('Markdown history policy', () => {
    it('merges consecutive text, composition, and matching-direction deletion operations', () => {
        expect(historyMergeGroup('insertText')).toBe(historyMergeGroup('insertCompositionText'));
        expect(historyMergeGroup('deleteContentBackward')).toBe(historyMergeGroup('deleteWordBackward'));
        expect(historyMergeGroup('deleteContentForward')).toBe(historyMergeGroup('deleteWordForward'));
        expect(historyMergeGroup('deleteContentBackward')).not.toBe(historyMergeGroup('deleteContentForward'));
        expect(historyMergeGroup('insertFromPaste')).toBeNull();
        expect(historyMergeGroup('formatBold')).toBeNull();
    });
    it('counts source text as well as HTML against the history memory limit', () => {
        expect(historyStateChars({ html: '<p>text</p>', sourceContent: 'text' })).toBe(15);
        expect(historyStateChars({ html: '<p>text</p>', sourceContent: null })).toBe(11);
    });
});

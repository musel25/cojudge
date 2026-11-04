import { describe, expect, it } from 'vitest';
import {
    displayTitle, filterProblems, groupProblems, groupStatistics,
    orderedCategories, pretty, readGroupSort, sortProblems, toggleGroupSort,
    type Problem
} from './catalog';

const problem = (id: string, overrides: Partial<Problem> = {}): Problem => ({
    id, title: id, difficulty: 'Easy', ...overrides
});

describe('home catalog search', () => {
    const problems = [
        problem('two-sum', { title: '1. Two Sum', statement: 'Find a pair' }),
        problem('reverse-list', { title: '2. Reverse List' }),
        problem('tree', { title: '3. Binary Tree' })
    ];
    it('keeps the complete list for whitespace and matches titles and slugs without case', () => {
        expect(filterProblems(problems, '  ')).toBe(problems);
        expect(filterProblems(problems, ' SUM ')).toEqual([problems[0]]);
        expect(filterProblems(problems, 'reverse-list')).toEqual([problems[1]]);
    });
    it('searches lazy statements while preferring an existing statement', () => {
        const index = { 'two-sum': 'indexed-only', tree: 'Traverse nodes' };
        expect(filterProblems(problems, 'traverse', index)).toEqual([problems[2]]);
        expect(filterProblems(problems, 'pair', index)).toEqual([problems[0]]);
        expect(filterProblems(problems, 'indexed-only', index)).toEqual([]);
    });
});

describe('home catalog groups', () => {
    it('groups blank categories together and counts only solved problems in each group', () => {
        const problems = [problem('a'), problem('b', { category: ' ' }), problem('c', { category: 'arrays' })];
        const groups = groupProblems(problems);
        expect(groups).toEqual({ uncategorized: problems.slice(0, 2), arrays: [problems[2]] });
        expect(groupStatistics(groups, { a: true, c: false, unrelated: true })).toEqual({
            uncategorized: { done: 1, total: 2 }, arrays: { done: 0, total: 1 }
        });
    });
    it('puts configured categories first and sorts other categories by display name', () => {
        expect(orderedCategories({ trees: [], 'two-pointers': [], arrays: [], stacks: [] }, ['trees', 'arrays']))
            .toEqual(['trees', 'arrays', 'stacks', 'two-pointers']);
    });
    it('formats category names without changing numeric ranges', () => {
        expect(pretty('two_pointers')).toBe('Two Pointers');
        expect(pretty('1-100')).toBe('1-100');
        expect(pretty('  ')).toBe('Uncategorized');
    });
    it('replaces a numbered prefix only when the course supplies a number', () => {
        expect(displayTitle(problem('a', { title: '7. Reverse', courseNumber: 206 }))).toBe('206. Reverse');
        expect(displayTitle(problem('a', { title: 'Reverse', courseNumber: 206 }))).toBe('Reverse');
        expect(displayTitle(null)).toBe('');
    });
});

describe('home catalog sorting', () => {
    it('sorts by course numbers before title prefixes without changing the source array', () => {
        const problems = [problem('a', { title: '1. A', courseNumber: 20 }), problem('b', { title: '9. B', courseNumber: 3 })];
        expect(sortProblems(problems).map(p => p.id)).toEqual(['b', 'a']);
        expect(problems.map(p => p.id)).toEqual(['a', 'b']);
    });
    it('uses numeric prefixes by default and text when prefixes are absent', () => {
        expect(sortProblems([problem('a', { title: '12. A' }), problem('b', { title: '2. B' })]).map(p => p.id)).toEqual(['b', 'a']);
        expect(sortProblems([problem('Zoo'), problem('Apple')]).map(p => p.id)).toEqual(['Apple', 'Zoo']);
    });
    it('uses displayed course titles for explicit title sorting', () => {
        const problems = [problem('a', { title: '1. A', courseNumber: 20 }), problem('b', { title: '9. B', courseNumber: 3 })];
        expect(sortProblems(problems, { key: 'title', dir: 'asc' }).map(p => p.id)).toEqual(['a', 'b']);
        expect(sortProblems(problems, { key: 'title', dir: 'desc' }).map(p => p.id)).toEqual(['b', 'a']);
    });
    it('sorts difficulty case-insensitively, unknown levels last, with title tie breakers', () => {
        const problems = [problem('z', { difficulty: 'EASY' }), problem('a'), problem('hard', { difficulty: 'Hard' }), problem('unknown', { difficulty: '?' })];
        expect(sortProblems(problems, { key: 'difficulty', dir: 'asc' }).map(p => p.id)).toEqual(['a', 'z', 'hard', 'unknown']);
        expect(sortProblems(problems, { key: 'difficulty', dir: 'desc' }).map(p => p.id)).toEqual(['unknown', 'hard', 'z', 'a']);
    });
    it('puts unsolved problems first ascending and reverses title ties descending', () => {
        const problems = [problem('a'), problem('b'), problem('c')];
        expect(sortProblems(problems, { key: 'status', dir: 'asc' }, { a: true }).map(p => p.id)).toEqual(['b', 'c', 'a']);
        expect(sortProblems(problems, { key: 'status', dir: 'desc' }, { a: true }).map(p => p.id)).toEqual(['a', 'c', 'b']);
    });
    it('starts a new column ascending and toggles the current column without changing other groups', () => {
        const initial = { arrays: { key: 'title', dir: 'asc' } } as const;
        const descending = toggleGroupSort(initial, 'arrays', 'title');
        expect(descending.arrays).toEqual({ key: 'title', dir: 'desc' });
        expect(toggleGroupSort(descending, 'arrays', 'difficulty').arrays).toEqual({ key: 'difficulty', dir: 'asc' });
        expect(toggleGroupSort(initial, 'trees', 'status')).toEqual({ ...initial, trees: { key: 'status', dir: 'asc' } });
        expect(initial.arrays.dir).toBe('asc');
    });
    it('restores only valid sort preferences and tolerates unavailable storage', () => {
        const getItem = () => JSON.stringify({ arrays: { key: 'status', dir: 'desc' }, bad: { key: 'random', dir: 'asc' }, broken: null });
        expect(readGroupSort({ getItem })).toEqual({ arrays: { key: 'status', dir: 'desc' } });
        expect(readGroupSort({ getItem: () => '[' })).toEqual({});
        expect(readGroupSort({ getItem: () => '[]' })).toEqual({});
        expect(readGroupSort({ getItem: () => { throw new Error('blocked'); } })).toEqual({});
        expect(readGroupSort()).toEqual({});
    });
});

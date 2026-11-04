export type ContentSource = 'custom' | 'modified' | 'bundled';
export type Problem = {
    id: string;
    title: string;
    difficulty: string;
    link?: string;
    category?: string;
    statement?: string;
    source?: ContentSource;
    courseNumber?: number;
};
export type CourseSummary = {
    id: string;
    title: string;
    source?: ContentSource;
    hidden?: boolean;
    problemIds?: string[];
};
export type SortKey = 'title' | 'difficulty' | 'status';
export type SortDir = 'asc' | 'desc';
export type GroupSort = Record<string, { key: SortKey; dir: SortDir }>;
export const GROUP_SORT_KEY = 'group-sort';

export function readGroupSort(storage?: Pick<Storage, 'getItem'>): GroupSort {
    try {
        const raw = storage?.getItem(GROUP_SORT_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const cleaned: GroupSort = {};
        for (const [group, conf] of Object.entries(parsed)) {
            if (!conf || typeof conf !== 'object') continue;
            if (conf.key !== 'title' && conf.key !== 'difficulty' && conf.key !== 'status') continue;
            if (conf.dir !== 'asc' && conf.dir !== 'desc') continue;
            cleaned[group] = { key: conf.key, dir: conf.dir };
        }
        return cleaned;
    } catch {
        return {};
    }
}

export function pretty(s?: string): string {
    const raw = s && s.trim().length > 0 ? s : 'uncategorized';
    const label = raw.replace(/[-_]+/g, (match, offset: number, full: string) => {
        const before = full[offset - 1] ?? '';
        const after = full[offset + match.length] ?? '';
        return /\d/.test(before) && /\d/.test(after) ? match : ' ';
    });
    return label.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function displayTitle(problem?: { title?: string | null; courseNumber?: number | null } | null): string {
    const title = problem?.title || '';
    return problem?.courseNumber != null ? title.replace(/^\d+\.\s*/, `${problem.courseNumber}. `) : title;
}

export function sourceLabel(source?: ContentSource): string {
    return source === 'custom' ? 'Custom' : source === 'modified' ? 'Modified' : '';
}

export function sourceTitle(source?: ContentSource): string {
    return source === 'custom'
        ? 'Custom content — only exists in your Cojudge folder'
        : source === 'modified'
            ? 'Modified — edited in your Cojudge folder, differs from the bundled copy'
            : '';
}

export function filterProblems(problems: Problem[], search: string, statementIndex: Record<string, string> = {}): Problem[] {
    const query = search.toLowerCase().trim();
    if (!query) return problems;
    return problems.filter((problem) =>
        (problem.title || '').toLowerCase().includes(query) ||
        (problem.id || '').toLowerCase().includes(query) ||
        (problem.statement || statementIndex[problem.id] || '').toLowerCase().includes(query));
}

export function groupProblems(problems: Problem[]): Record<string, Problem[]> {
    const groups: Record<string, Problem[]> = {};
    for (const problem of problems) {
        const category = problem.category?.trim() ? problem.category : 'uncategorized';
        if (!groups[category]) groups[category] = [];
        groups[category].push(problem);
    }
    return groups;
}

export function groupStatistics(groups: Record<string, Problem[]>, solved: Record<string, boolean>) {
    return Object.fromEntries(Object.entries(groups).map(([category, problems]) => [category, {
        done: problems.reduce((count, problem) => count + (solved[problem.id] ? 1 : 0), 0),
        total: problems.length
    }]));
}

export function orderedCategories(groups: Record<string, Problem[]>, categoryOrder: string[]): string[] {
    const order: Record<string, number> = {};
    categoryOrder.forEach((category, index) => { if (category) order[category] = index; });
    return Object.keys(groups).toSorted((a, b) => {
        const rankA = order[a] ?? Number.POSITIVE_INFINITY;
        const rankB = order[b] ?? Number.POSITIVE_INFINITY;
        return rankA !== rankB ? rankA - rankB : pretty(a).localeCompare(pretty(b));
    });
}

export function toggleGroupSort(groupSort: GroupSort, group: string, column: SortKey): GroupSort {
    const current = groupSort[group];
    const dir = current?.key === column && current.dir === 'asc' ? 'desc' : 'asc';
    return { ...groupSort, [group]: { key: column, dir } };
}

const difficultyRank: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

export function sortProblems(problems: Problem[], conf?: GroupSort[string], solved: Record<string, boolean> = {}): Problem[] {
    if (!conf) {
        return problems.toSorted((a, b) => {
            if (a.courseNumber != null && b.courseNumber != null) return a.courseNumber - b.courseNumber;
            const numberA = Number.parseInt(a.title?.split('.')[0] ?? 'NaN');
            const numberB = Number.parseInt(b.title?.split('.')[0] ?? 'NaN');
            if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) return numberA - numberB;
            return (a.title || '').localeCompare(b.title || '');
        });
    }
    const direction = conf.dir === 'asc' ? 1 : -1;
    return problems.toSorted((a, b) => {
        if (conf.key === 'title') {
            return direction * displayTitle(a).localeCompare(displayTitle(b), undefined, { sensitivity: 'base' });
        }
        const rankA = conf.key === 'status' ? (solved[a.id] ? 1 : 0) : difficultyRank[(a.difficulty || '').toLowerCase()] ?? 99;
        const rankB = conf.key === 'status' ? (solved[b.id] ? 1 : 0) : difficultyRank[(b.difficulty || '').toLowerCase()] ?? 99;
        return direction * (rankA - rankB || displayTitle(a).localeCompare(displayTitle(b)));
    });
}

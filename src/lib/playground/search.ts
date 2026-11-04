import type { FileEntry } from '../stores/fileStore';
import type { ProgrammingLanguage } from '../utils/util';
import type { TabMeta } from './workspace';

export type WorkspaceSearchResult = {
    fileId: string; fileName: string; language: ProgrammingLanguage; fileNameMatch: boolean;
    matches: { line: number; text: string; language: ProgrammingLanguage }[];
};

export function searchWorkspace(
files: readonly FileEntry[], tabs: readonly TabMeta[], query: string,
caseSensitive: boolean, useRegex: boolean, languageById: Record<string, ProgrammingLanguage>
): WorkspaceSearchResult[] {
    if (!query) return [];

    let pattern: RegExp;
    let fileNamePattern: RegExp;
    try {
        const flags = caseSensitive ? 'g' : 'gi';
        if (useRegex) {
            pattern = new RegExp(query, flags);
            fileNamePattern = new RegExp(query, flags);
        } else {
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            pattern = new RegExp(escaped, flags);
            fileNamePattern = new RegExp(escaped, flags);
        }
    } catch {
        return [];
    }

    const resultsMap = new Map<string, { fileId: string; fileName: string; language: ProgrammingLanguage; fileNameMatch: boolean; matches: { line: number; text: string; language: ProgrammingLanguage }[] }>();

    // First, check filenames from tabs
    for (const t of tabs) {
        fileNamePattern.lastIndex = 0;
        if (fileNamePattern.test(t.fileName)) {
            resultsMap.set(t.fileId, {
                fileId: t.fileId,
                fileName: t.fileName,
                language: languageById[t.fileId] ?? 'plaintext',
                fileNameMatch: true,
                matches: []
            });
        }
    }

    // Then, check all contents in all FileEntries
    for (const f of files) {
        const content = f.content ?? '';
        const lines = content.split('\n');
        const fileMatches: { line: number; text: string; language: ProgrammingLanguage }[] = [];
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            pattern.lastIndex = 0;
            if (pattern.test(lineText)) {
                fileMatches.push({ line: i + 1, text: lineText, language: f.language as ProgrammingLanguage });
            }
        }

        if (fileMatches.length > 0) {
            let existing = resultsMap.get(f.fileId);
            if (!existing) {
                const tab = tabs.find(t => t.fileId === f.fileId);
                const fname = tab ? tab.fileName : (f.fileName || 'Solution');
                existing = {
                    fileId: f.fileId,
                    fileName: fname,
                    language: f.language as ProgrammingLanguage,
                    fileNameMatch: false,
                    matches: []
                };
                resultsMap.set(f.fileId, existing);
            }
            // Only add matches if they aren't already added (avoid duplicates across languages if content is identical)
            for (const m of fileMatches) {
                if (!existing.matches.find(exm => exm.line === m.line && exm.text === m.text && exm.language === m.language)) {
                    existing.matches.push(m);
                }
            }
        }
    }

    return Array.from(resultsMap.values());
}

export function highlightMatch(text: string, query: string, caseSensitive: boolean, useRegex: boolean): string {
    if (!query) return escapeHtml(text);
    try {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = useRegex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        let html = '';
        let offset = 0;
        for (const match of text.matchAll(regex)) {
            if (!match[0]) continue;
            html += escapeHtml(text.slice(offset, match.index));
            html += `<mark>${escapeHtml(match[0])}</mark>`;
            offset = match.index + match[0].length;
        }
        return html + escapeHtml(text.slice(offset));
    } catch {
        return escapeHtml(text);
    }
}

export function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


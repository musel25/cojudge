/** Build a document-find expression. Invalid regular expressions match nothing. */
export function createMarkdownFindPattern(query: string, caseSensitive: boolean, regex: boolean, wholeWord: boolean): RegExp | null {
    if (!query) return null;
    try {
        if (regex) return new RegExp(query, caseSensitive ? 'g' : 'gi');
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
        return new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    } catch {
        return null;
    }
}

export function historyMergeGroup(kind: string): string | null {
    if (kind === 'insertText' || kind === 'insertCompositionText') return 'insertText';
    if (kind === 'deleteContentBackward' || kind === 'deleteWordBackward') return 'deleteBackward';
    if (kind === 'deleteContentForward' || kind === 'deleteWordForward') return 'deleteForward';
    return null;
}

export function historyStateChars(state: { html: string; sourceContent: string | null }): number {
    return state.html.length + (state.sourceContent?.length ?? 0);
}

import type { FileEntry } from '../stores/fileStore';

export type TabMeta = { fileId: string; fileName: string; isOpen: boolean; lastUpdated?: number; type?: 'editor' | 'preview' | 'whiteboard'; sourceFileId?: string };

export function isSpecialTabType(type?: string): type is 'preview' | 'whiteboard' {
    return type === 'preview' || type === 'whiteboard';
}

export type ExplorerNode = {
    fileId: string;
    fileName: string;
    kind: 'file' | 'folder';
    lastUpdated?: number;
    order: number;
    children: ExplorerNode[];
};

export type FlatExplorerItem =
    | (ExplorerNode & { depth: number; kind: 'file' | 'folder' })
    | { kind: 'empty'; fileId: string; depth: number };

/** Portable folder/file tree for download/import. fileId is kept when possible. */
export type ExportNode =
    | { type: 'folder'; name: string; fileId?: string; children: ExportNode[] }
    | { type: 'file'; name: string; fileId?: string; languages: Array<{ language: string; content: string; lastLanguage?: string }> };

export function isFolderEntry(f: FileEntry): boolean {
    return f.type === 'folder';
}

export function nextOrder(files: FileEntry[]): number {
    let max = -1;
    for (const f of files) {
        if (typeof f.order === 'number' && f.order > max) max = f.order;
    }
    return max + 1;
}

export function uniqueName(base: string, existing: string[]): string {
    if (!existing.includes(base)) return base;
    let n = 1;
    while (existing.includes(`${base}-${n}`)) n++;
    return `${base}-${n}`;
}

export function collectDescendantIds(rootId: string, files: FileEntry[]): Set<string> {
    const ids = new Set<string>([rootId]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const f of files) {
            if (f.parentId && ids.has(f.parentId) && !ids.has(f.fileId)) {
                ids.add(f.fileId);
                changed = true;
            }
        }
    }
    return ids;
}

export function buildExplorerTree(files: FileEntry[], tabs: TabMeta[]): ExplorerNode[] {
    type Item = {
        fileId: string;
        fileName: string;
        kind: 'file' | 'folder';
        parentId: string | null;
        order: number;
        lastUpdated?: number;
        firstIndex: number;
    };
    const items = new Map<string, Item>();

    files.forEach((f, idx) => {
        if (isSpecialTabType(f.type)) return;
        if (isFolderEntry(f)) {
            const orderVal = typeof f.order === 'number' ? f.order : idx;
            items.set(f.fileId, {
                fileId: f.fileId,
                fileName: f.fileName || 'Folder',
                kind: 'folder',
                parentId: f.parentId ?? null,
                order: orderVal,
                lastUpdated: f.lastUpdated,
                firstIndex: idx
            });
            return;
        }
        const existing = items.get(f.fileId);
        const orderVal = typeof f.order === 'number' ? f.order : idx;
        const lv = f.lastUpdated || 0;
        if (!existing) {
            items.set(f.fileId, {
                fileId: f.fileId,
                fileName: f.fileName || 'Solution',
                kind: 'file',
                parentId: f.parentId ?? null,
                order: orderVal,
                lastUpdated: lv,
                firstIndex: idx
            });
        } else {
            if (orderVal < existing.order) existing.order = orderVal;
            if (lv > (existing.lastUpdated ?? 0)) existing.lastUpdated = lv;
            if (f.parentId !== undefined) existing.parentId = f.parentId ?? null;
            if (f.fileName) existing.fileName = f.fileName;
        }
    });

    // Include pristine in-memory tabs not yet in the store
    tabs.forEach((t, idx) => {
        if (isSpecialTabType(t.type)) return;
        if (items.has(t.fileId)) {
            const it = items.get(t.fileId)!;
            it.fileName = t.fileName;
            if ((t.lastUpdated ?? 0) > (it.lastUpdated ?? 0)) it.lastUpdated = t.lastUpdated;
            return;
        }
        items.set(t.fileId, {
            fileId: t.fileId,
            fileName: t.fileName,
            kind: 'file',
            parentId: null,
            order: idx,
            lastUpdated: t.lastUpdated,
            firstIndex: 100000 + idx
        });
    });

    const nodeMap = new Map<string, ExplorerNode>();
    for (const it of items.values()) {
        nodeMap.set(it.fileId, {
            fileId: it.fileId,
            fileName: it.fileName,
            kind: it.kind,
            lastUpdated: it.lastUpdated,
            order: it.order,
            children: []
        });
    }

    const roots: ExplorerNode[] = [];
    for (const it of items.values()) {
        const node = nodeMap.get(it.fileId)!;
        if (it.parentId && nodeMap.has(it.parentId) && nodeMap.get(it.parentId)!.kind === 'folder') {
            nodeMap.get(it.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    }

    const sortRec = (nodes: ExplorerNode[]) => {
        nodes.sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
            if (a.order !== b.order) return a.order - b.order;
            return a.fileName.localeCompare(b.fileName);
        });
        for (const n of nodes) sortRec(n.children);
    };
    sortRec(roots);
    return roots;

}

export function flattenExplorer(
    nodes: ExplorerNode[],
    collapsed: Record<string, boolean> = {},
    depth = 0
): FlatExplorerItem[] {
    const result: FlatExplorerItem[] = [];
    for (const n of nodes) {
        result.push({ ...n, depth });
        if (n.kind === 'folder' && !collapsed[n.fileId]) {
            if (n.children.length === 0) {
                result.push({ kind: 'empty', fileId: `${n.fileId}__empty`, depth: depth + 1 });
            } else {
                result.push(...flattenExplorer(n.children, collapsed, depth + 1));
            }
        }
    }
    return result;
}


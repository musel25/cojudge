import { describe, expect, it } from 'vitest';
import type { FileEntry } from '../stores/fileStore';
import { buildExplorerTree, collectDescendantIds, flattenExplorer, uniqueName } from './workspace';

const entry = (fileId: string, extra: Partial<FileEntry> = {}): FileEntry => ({
	fileId, fileName: fileId, content: '', language: 'python', isActive: false, ...extra
});

describe('playground explorer', () => {
	it('groups language variants under one file and keeps folders before files', () => {
		const tree = buildExplorerTree([
			entry('code', { parentId: 'folder', order: 1, lastUpdated: 1 }),
			entry('code', { parentId: 'folder', language: 'java', lastUpdated: 3 }),
			entry('folder', { type: 'folder', order: 4 }),
			entry('loose', { order: 0 }), entry('preview', { type: 'preview' })
		], [{ fileId: 'code', fileName: 'Current name', isOpen: true }]);
		expect(tree.map(node => node.fileId)).toEqual(['folder', 'loose']);
		expect(tree[0].children).toMatchObject([{ fileId: 'code', fileName: 'Current name', lastUpdated: 3 }]);
	});

	it('shows pristine tabs and files with unavailable parents at the root', () => {
		const tree = buildExplorerTree([entry('orphan', { parentId: 'gone' })], [
			{ fileId: 'fresh', fileName: 'New file', isOpen: true },
			{ fileId: 'board', fileName: 'Board', isOpen: true, type: 'whiteboard' }
		]);
		expect(tree.map(node => node.fileId)).toEqual(['fresh', 'orphan']);
	});

	it('respects collapsed folders and provides an empty-folder placeholder', () => {
		const tree = buildExplorerTree([entry('empty', { type: 'folder' })], []);
		expect(flattenExplorer(tree, {}).map(node => [node.fileId, node.depth])).toEqual([['empty', 0], ['empty__empty', 1]]);
		expect(flattenExplorer(tree, { empty: true }).map(node => node.fileId)).toEqual(['empty']);
	});

	it('collects nested descendants once even when parent data contains a cycle', () => {
		expect([...collectDescendantIds('a', [entry('a', { parentId: 'b' }), entry('b', { parentId: 'a' }), entry('c', { parentId: 'b' })])])
			.toEqual(['a', 'b', 'c']);
	});

	it('finds the first available duplicate name', () => {
		expect(uniqueName('Notes', ['Notes', 'Notes-1', 'Notes-3'])).toBe('Notes-2');
	});
});

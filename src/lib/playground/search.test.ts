import { describe, expect, it } from 'vitest';
import type { FileEntry } from '../stores/fileStore';
import { highlightMatch, searchWorkspace } from './search';

const files: FileEntry[] = [
	{ fileId: 'a', fileName: 'Notes', content: 'One\nneedle', language: 'python', isActive: false },
	{ fileId: 'a', fileName: 'Notes', content: 'needle', language: 'java', isActive: false },
	{ fileId: 'b', fileName: 'Other', content: 'Needle', language: 'markdown', isActive: false }
];
const tabs = [{ fileId: 'a', fileName: 'Needle notes', isOpen: true }];

describe('workspace search', () => {
	it('groups filename and content matches while preserving language and line numbers', () => {
		expect(searchWorkspace(files, tabs, 'needle', false, false, { a: 'python' })).toEqual([
			{ fileId: 'a', fileName: 'Needle notes', language: 'python', fileNameMatch: true,
				matches: [{ line: 2, text: 'needle', language: 'python' }, { line: 1, text: 'needle', language: 'java' }] },
			{ fileId: 'b', fileName: 'Other', language: 'markdown', fileNameMatch: false,
				matches: [{ line: 1, text: 'Needle', language: 'markdown' }] }
		]);
	});

	it('handles case sensitivity, literal punctuation, and invalid expressions', () => {
		expect(searchWorkspace(files, [], 'Needle', true, false, {}).map(file => file.fileId)).toEqual(['b']);
		expect(searchWorkspace(files, [], '.*', false, false, {})).toEqual([]);
		expect(searchWorkspace(files, [], '[', false, true, {})).toEqual([]);
		expect(searchWorkspace(files, [], '', false, false, {})).toEqual([]);
	});

	it('highlights the original text and escapes HTML in matched and unmatched parts', () => {
		expect(highlightMatch('<b> & </b>', '<b>', false, false))
			.toBe('<mark>&lt;b&gt;</mark> &amp; &lt;/b&gt;');
		expect(highlightMatch('<img src=x>', '.*', false, true))
			.toBe('<mark>&lt;img src=x&gt;</mark>');
		expect(highlightMatch('a & b', '[', false, true)).toBe('a &amp; b');
	});
});

import { describe, expect, it } from 'vitest';
import { cloudAccountId, parseCloudCloneRecord, referencedPastedImageIds, retainReferencedPastedImages } from './localSnapshot';

describe('local cloud snapshots', () => {
	it('keeps account keys distinct across projects and users', () => {
		expect(cloudAccountId('project-a', 'user')).not.toBe(cloudAccountId('project-b', 'user'));
		expect(cloudAccountId('project', 'a,b')).not.toBe(cloudAccountId('project,a', 'b'));
	});

	it('ignores corrupt cached snapshots without blocking local work', () => {
		for (const value of [null, '{broken', 'null', '[]', '{}', '{"accountId":1}']) {
			expect(parseCloudCloneRecord(value)).toBeNull();
		}
		expect(parseCloudCloneRecord(JSON.stringify({ accountId: 'account', checksum: 'hash', serialized: '{}' })))
			.toEqual({ accountId: 'account', checksum: 'hash', serialized: '{}', revisionId: null });
	});

	it('collects only image references in valid Markdown entries', () => {
		const files = {
			valid: JSON.stringify([{ language: 'markdown', content: '![x](cojudge://image/keep)' }]),
			code: JSON.stringify([{ language: 'python', content: '![x](cojudge://image/code)' }]),
			broken: '[broken', invalid: JSON.stringify([null, 1, {}, []])
		};
		expect([...referencedPastedImageIds(files)]).toEqual(['keep']);
	});

	it('keeps referenced images from the first available source without mutating inputs', () => {
		const files = { notes: JSON.stringify([{ language: 'markdown', content: '![x](cojudge://image/keep)' }]) };
		const data = { files, 'pasted-images': { old: 'unused' } };
		expect(retainReferencedPastedImages(data, [null, { keep: 'first', unused: 'unused' }, { keep: 'second' }]))
			.toEqual({ files, 'pasted-images': { keep: 'first' } });
		expect(data['pasted-images']).toEqual({ old: 'unused' });
		expect(retainReferencedPastedImages({ files: {}, 'pasted-images': { old: 'unused' } }, []))
			.toEqual({ files: {} });
	});
});

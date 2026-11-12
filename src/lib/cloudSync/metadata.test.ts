import { describe, expect, it } from 'vitest';
import { parseHistoryMeta, parseRemoteMeta } from './metadata';

const checksum = 'a'.repeat(64);
const timestamp = { toMillis: () => 1_700_000_000_000 };
const latest = {
	schemaVersion: 3, snapshotId: 'slot-0', revisionId: 'revision-1234', parentRevisionId: null,
	checksum, payloadChecksum: checksum, partCount: 1, totalBytes: 2,
	assetSetId: null, assetPartCount: 0, assetBytes: 0, updatedAt: timestamp, meaningful: true
};

describe('cloud snapshot metadata', () => {
	it('reads a current snapshot without images', () => {
		expect(parseRemoteMeta(latest)).toMatchObject({
			snapshotId: 'slot-0', revisionId: 'revision-1234', assetStorage: 'none',
			assetSetId: null, updatedAt: 1_700_000_000_000, meaningful: true
		});
	});

	it('preserves legacy snapshots that use their snapshot ID as the revision', () => {
		expect(parseRemoteMeta({
			schemaVersion: 1, snapshotId: 'legacy-1234', checksum, partCount: 1,
			totalBytes: 2, updatedAt: timestamp
		})).toMatchObject({ revisionId: 'legacy-1234', payloadChecksum: checksum, assetStorage: 'none' });
	});

	it('locates version two images inside the selected revision', () => {
		expect(parseRemoteMeta({ ...latest, schemaVersion: 2, assetRevisionId: 'revision-1234',
			assetChecksum: checksum, assetPartCount: 1, assetBytes: 3
		})).toMatchObject({ assetStorage: 'revision', assetSetId: 'revision-1234', assetChecksum: checksum });
	});

	it('locates shared images by their content checksum', () => {
		expect(parseRemoteMeta({ ...latest, assetSetId: checksum, assetPartCount: 1, assetBytes: 3 }))
			.toMatchObject({ assetStorage: 'shared', assetSetId: checksum, assetChecksum: checksum });
	});

	it.each([
		{ schemaVersion: 99 }, { snapshotId: '../another-user' }, { revisionId: 'bad/id' },
		{ parentRevisionId: 'bad/id' }, { checksum: 'wrong' }, { payloadChecksum: 'wrong' },
		{ partCount: 0 }, { partCount: 13 }, { totalBytes: -1 }, { totalBytes: 6 * 1024 * 1024 + 1 },
		{ assetPartCount: 1 }, { assetSetId: checksum }, { assetPartCount: 1, assetBytes: 3 },
		{ updatedAt: { toMillis: () => 0 } }
	])('rejects malformed or oversized latest metadata: %j', (invalid) => {
		expect(() => parseRemoteMeta({ ...latest, ...invalid })).toThrow();
	});

	it('does not offer incomplete or corrupt snapshots as recovery history', () => {
		expect(parseHistoryMeta('slot-0', { ...latest, status: 'staging', createdAt: timestamp })).toBeNull();
		expect(parseHistoryMeta('slot-0', { ...latest, status: 'ready', checksum: 'wrong', createdAt: timestamp })).toBeNull();
		expect(parseHistoryMeta('slot-0', { ...latest, status: 'ready', createdAt: timestamp }))
			.toMatchObject({ revisionId: 'revision-1234', updatedAt: 1_700_000_000_000 });
	});
});

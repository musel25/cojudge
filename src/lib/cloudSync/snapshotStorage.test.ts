import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore/lite';
import { hashProgress, serializeProgressData } from '../progressBackup';
import { readRemoteMeta, uploadSnapshot, downloadSnapshot } from './snapshotStorage';

// Replace the external database boundary. Keep serialization, paths, transaction
// decisions, metadata validation, and integrity checks in the production code.
const database = vi.hoisted(() => new Map<string, Record<string, unknown>>());
vi.mock('firebase/firestore/lite', () => {
	type Ref = { path: string };
	const reference = (base: Ref | unknown, ...parts: string[]): Ref => ({
		path: [base && typeof base === 'object' && 'path' in base ? String(base.path) : '', ...parts].filter(Boolean).join('/')
	});
	const result = (ref: Ref) => ({
		id: ref.path.split('/').at(-1), ref, exists: () => database.has(ref.path),
		data: () => database.get(ref.path)
	});
	return {
		doc: reference, collection: reference,
		getDoc: async (ref: Ref) => result(ref),
		query: (ref: Ref) => ref, orderBy: () => null, limit: () => null,
		getDocs: async (ref: Ref) => {
			const docs = [...database.keys()].filter(key => key.startsWith(`${ref.path}/`) &&
				!key.slice(ref.path.length + 1).includes('/')).sort().map(path => result({ path }));
			return { docs, size: docs.length };
		},
		serverTimestamp: () => ({ toMillis: () => 1_700_000_000_000 }),
		runTransaction: async (_db: unknown, operation: (transaction: unknown) => Promise<unknown>) => {
			const changes: Array<() => void> = [];
			const value = await operation({
				get: async (ref: Ref) => result(ref),
				set: (ref: Ref, data: Record<string, unknown>) => changes.push(() => database.set(ref.path, data)),
				delete: (ref: Ref) => changes.push(() => database.delete(ref.path))
			});
			changes.forEach(commit => commit());
			return value;
		},
		Bytes: class {}, deleteDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), writeBatch: vi.fn()
	};
});

const db = {} as Firestore;
const data = { solutions: { 'two-sum': 'return [0, 1]' } };
async function snapshot() {
	return { data, checksum: await hashProgress(serializeProgressData(data)), meaningful: true };
}
beforeEach(() => database.clear());

describe('cloud snapshot storage', () => {
	it('round trips a snapshot within its account and leaves another account empty', async () => {
		const revisionId = await uploadSnapshot(db, 'alice', await snapshot(), null);
		const meta = await readRemoteMeta(db, 'alice');
		expect(meta).toMatchObject({ revisionId, snapshotId: 'slot-0' });
		expect(await downloadSnapshot(db, 'alice', meta!)).toEqual({ data, serialized: '{"solutions":{"two-sum":"return [0, 1]"}}' });
		expect(await readRemoteMeta(db, 'bob')).toBeNull();
	});

	it('rejects an upload based on a stale revision without replacing saved work', async () => {
		await uploadSnapshot(db, 'alice', await snapshot(), null);
		const first = await readRemoteMeta(db, 'alice');
		await expect(uploadSnapshot(db, 'alice', await snapshot(), null)).rejects.toThrow('changed on another device');
		expect(await readRemoteMeta(db, 'alice')).toEqual(first);
	});

	it('advances the retained slot while preserving the parent revision', async () => {
		await uploadSnapshot(db, 'alice', await snapshot(), null);
		const first = await readRemoteMeta(db, 'alice');
		await uploadSnapshot(db, 'alice', await snapshot(), first);
		expect(await readRemoteMeta(db, 'alice')).toMatchObject({ snapshotId: 'slot-1', parentRevisionId: first!.revisionId });
	});

	it.each(['missing', 'wrong-index', 'corrupt-text'])('rejects a %s download before applying progress', async (damage) => {
		await uploadSnapshot(db, 'alice', await snapshot(), null);
		const meta = await readRemoteMeta(db, 'alice');
		const path = 'users/alice/snapshots/slot-0/parts/0000';
		if (damage === 'missing') database.delete(path);
		else if (damage === 'wrong-index') database.set(path, { ...database.get(path), index: 1 });
		else database.set(path, { index: 0, data: 'x'.repeat(meta!.totalBytes) });
		await expect(downloadSnapshot(db, 'alice', meta!)).rejects.toThrow();
	});
});

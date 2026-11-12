// Firestore snapshot I/O. The synchronization controller decides when to call it.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore/lite';
import { CLOUD_HISTORY_LIMIT, nextCloudSnapshotSlot } from '../cloudSyncPolicy';
import { CLOUD_SNAPSHOT_LEGACY_VERSION, CLOUD_SNAPSHOT_VERSION, decodeProgressParts, encodeProgressParts, hashProgress, serializeProgressData, type ProgressData } from '../progressBackup';
import { MAX_CLOUD_ASSET_BYTES, MAX_CLOUD_ASSET_PARTS, encodeCloudAssetParts, extractCloudAssets, hashCloudAssetBytes, hydrateCloudAssets } from '../cloudAssets';
import { latestRef, snapshotRef, partsRef } from './references';
import { MAX_SNAPSHOT_BYTES, MAX_SNAPSHOT_PARTS, integer, parseRemoteMeta, parseHistoryMeta, cloudAssetSet, makeRevisionId, type CloudAssetSet, type RemoteSnapshotMeta } from './metadata';
import { ensureSharedCloudAssetSet, collectSharedCloudAssetSetQuietly, deleteCloudAssetSetQuietly, downloadCloudAssetSet } from './assetStorage';

export type UploadSnapshot = { data: ProgressData; checksum: string; meaningful: boolean };
export type DownloadedSnapshot = { data: ProgressData; serialized: string };

export async function readRemoteMeta(db: Firestore, uid: string): Promise<RemoteSnapshotMeta | null> {
	const result = await getDoc(latestRef(db, uid));
	return result.exists() ? parseRemoteMeta(result.data()) : null;
}

export async function readRemoteHistory(
	db: Firestore,
	uid: string,
	current: RemoteSnapshotMeta | null | Promise<RemoteSnapshotMeta | null>
): Promise<RemoteSnapshotMeta[]> {
	const [result, resolvedCurrent] = await Promise.all([
		getDocs(
			query(
				collection(db, 'users', uid, 'snapshots'),
				orderBy('createdAt', 'desc'),
				limit(CLOUD_HISTORY_LIMIT)
			)
		),
		current
	]);
	const history = result.docs
		.map((snapshot) => parseHistoryMeta(snapshot.id, snapshot.data()))
		.filter((snapshot): snapshot is RemoteSnapshotMeta => snapshot !== null);
	if (resolvedCurrent && !history.some((snapshot) => snapshot.revisionId === resolvedCurrent.revisionId)) {
		history.unshift(resolvedCurrent);
	}
	return history.slice(0, CLOUD_HISTORY_LIMIT);
}

export async function uploadSnapshot(
	db: Firestore,
	uid: string,
	local: UploadSnapshot,
	previous: RemoteSnapshotMeta | null
): Promise<string> {
	const extracted = await extractCloudAssets(local.data);
	const payloadSerialized = serializeProgressData(extracted.data);
	const payloadChecksum = await hashProgress(payloadSerialized);
	const { parts, totalBytes } = encodeProgressParts(payloadSerialized);
	if (totalBytes > MAX_SNAPSHOT_BYTES || parts.length > MAX_SNAPSHOT_PARTS) {
		throw new Error('Progress text is too large for Cojudge Cloud even after images were separated.');
	}
	const assetParts = encodeCloudAssetParts(extracted.bytes);
	if (extracted.bytes.length > MAX_CLOUD_ASSET_BYTES || assetParts.length > MAX_CLOUD_ASSET_PARTS) {
		throw new Error('Cloud images exceed the 64 MB limit.');
	}

	const snapshotId = nextCloudSnapshotSlot(previous?.snapshotId ?? null);
	const revisionId = makeRevisionId();
	const parentRevisionId = previous?.revisionId ?? null;
	const manifest = snapshotRef(db, uid, snapshotId);
	const assetChecksum = extracted.bytes.length > 0
		? await hashCloudAssetBytes(extracted.bytes)
		: null;
	const preparedAssetSet: CloudAssetSet | null = assetChecksum
		? {
				storage: 'shared',
				snapshotId: null,
				assetSetId: assetChecksum,
				partCount: assetParts.length,
				totalBytes: extracted.bytes.length,
				checksum: assetChecksum
			}
		: null;
	const assetSetCreated = preparedAssetSet
		? await ensureSharedCloudAssetSet(db, uid, preparedAssetSet, assetParts)
		: false;

	let replacedAssetSet: CloudAssetSet | null = null;
	try {
		replacedAssetSet = await runTransaction(db, async (transaction) => {
			const reference = latestRef(db, uid);
			const current = await transaction.get(reference);
			const previousManifest = await transaction.get(manifest);
			const previousPartCount = previousManifest.exists()
				? integer(previousManifest.data().partCount, 1, MAX_SNAPSHOT_PARTS, 'part count')
				: 0;
			const previousMeta = previousManifest.exists()
				? parseHistoryMeta(previousManifest.id, previousManifest.data())
				: null;
			const currentData = current.exists() ? current.data() : null;
			const currentSnapshotId = typeof currentData?.snapshotId === 'string' ? currentData.snapshotId : null;
			const currentRevisionId = typeof currentData?.revisionId === 'string'
				? currentData.revisionId
				: currentSnapshotId;
			if (currentRevisionId !== parentRevisionId) {
				throw new Error('Cloud progress changed on another device. Sync again.');
			}

			const assetMetadata = {
				payloadChecksum,
				assetSetId: preparedAssetSet?.assetSetId ?? null,
				assetPartCount: preparedAssetSet?.partCount ?? 0,
				assetBytes: preparedAssetSet?.totalBytes ?? 0
			};
			transaction.set(manifest, {
				schemaVersion: CLOUD_SNAPSHOT_VERSION,
				status: 'ready',
				revisionId,
				parentRevisionId,
				checksum: local.checksum,
				...assetMetadata,
				partCount: parts.length,
				totalBytes,
				meaningful: local.meaningful,
				createdAt: serverTimestamp()
			});
			for (let index = 0; index < MAX_SNAPSHOT_PARTS; index++) {
				const part = doc(partsRef(db, uid, snapshotId), index.toString().padStart(4, '0'));
				if (index < parts.length) transaction.set(part, { index, data: parts[index] });
				else if (index < previousPartCount) transaction.delete(part);
			}
			transaction.set(reference, {
				schemaVersion: CLOUD_SNAPSHOT_VERSION,
				snapshotId,
				revisionId,
				parentRevisionId,
				checksum: local.checksum,
				...assetMetadata,
				partCount: parts.length,
				totalBytes,
				storageUsed: totalBytes + (preparedAssetSet?.totalBytes ?? 0),
				meaningful: local.meaningful,
				updatedAt: serverTimestamp()
			});
			return cloudAssetSet(previousMeta);
		});
	} catch (error) {
		if (assetSetCreated && preparedAssetSet) {
			await collectSharedCloudAssetSetQuietly(db, uid, preparedAssetSet, 'the rejected upload');
		}
		throw error;
	}
	if (replacedAssetSet?.storage === 'revision') {
		await deleteCloudAssetSetQuietly(db, uid, replacedAssetSet, 'an expired revision');
	} else if (
		replacedAssetSet?.storage === 'shared'
		&& replacedAssetSet.assetSetId !== preparedAssetSet?.assetSetId
	) {
		await collectSharedCloudAssetSetQuietly(db, uid, replacedAssetSet, 'an expired revision');
	}
	return revisionId;
}

export async function downloadSnapshot(
	db: Firestore,
	uid: string,
	meta: RemoteSnapshotMeta
): Promise<DownloadedSnapshot> {
	const result = await getDocs(query(partsRef(db, uid, meta.snapshotId), orderBy('index')));
	if (result.size !== meta.partCount) throw new Error('Cloud snapshot is incomplete.');

	const parts = result.docs.map((part, index) => {
		const data = part.data();
		if (data.index !== index || typeof data.data !== 'string') {
			throw new Error('Cloud snapshot contains an invalid part.');
		}
		return data.data;
	});
	const payloadSerialized = decodeProgressParts(parts, meta.totalBytes);
	if ((await hashProgress(payloadSerialized)) !== meta.payloadChecksum) {
		throw new Error('Cloud snapshot failed its integrity check.');
	}

	const parsed = JSON.parse(payloadSerialized);
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error('Cloud snapshot has an invalid format.');
	}
	if (meta.schemaVersion === CLOUD_SNAPSHOT_LEGACY_VERSION) {
		return { data: parsed as ProgressData, serialized: payloadSerialized };
	}

	const assetBytes = await downloadCloudAssetSet(db, uid, meta);
	const data = await hydrateCloudAssets(parsed as ProgressData, assetBytes);
	const serialized = serializeProgressData(data);
	if ((await hashProgress(serialized)) !== meta.checksum) {
		throw new Error('Cloud snapshot failed its hydrated integrity check.');
	}
	return { data, serialized };
}


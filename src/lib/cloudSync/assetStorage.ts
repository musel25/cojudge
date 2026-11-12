// Image upload and collection lifecycle. Snapshot retention protects shared images.
import { Bytes, deleteDoc, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch, type Firestore } from 'firebase/firestore/lite';
import { CLOUD_HISTORY_LIMIT } from '../cloudSyncPolicy';
import { CLOUD_SNAPSHOT_VERSION } from '../progressBackup';
import { decodeCloudAssetParts, hashCloudAssetBytes } from '../cloudAssets';
import { cloudAssetSetRef, cloudAssetPartsRef, snapshotRef } from './references';
import { CLOUD_ASSET_SET_VERSION, cloudAssetManifestMatches, cloudAssetSet, makeRevisionId, sharedAssetUploadState, type CloudAssetSet, type RemoteSnapshotMeta } from './metadata';

const CLOUD_ASSET_BATCH_PARTS = 8;
const CLOUD_ASSET_STALE_WAIT_MS = 5 * 60 * 1000;
const CLOUD_ASSET_READY_WAIT_MS = CLOUD_ASSET_STALE_WAIT_MS + 60 * 1000;

function wait(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function deleteCloudAssetSet(db: Firestore, uid: string, assetSet: CloudAssetSet): Promise<void> {
	const result = await getDocs(
		query(cloudAssetPartsRef(db, uid, assetSet), orderBy('index'))
	);
	for (let offset = 0; offset < result.docs.length; offset += CLOUD_ASSET_BATCH_PARTS) {
		const batch = writeBatch(db);
		for (const part of result.docs.slice(offset, offset + CLOUD_ASSET_BATCH_PARTS)) {
			batch.delete(part.ref);
		}
		await batch.commit();
	}
	await deleteDoc(cloudAssetSetRef(db, uid, assetSet));
}

export async function deleteCloudAssetSetQuietly(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet,
	label: string
): Promise<void> {
	try {
		await deleteCloudAssetSet(db, uid, assetSet);
	} catch (error) {
		console.warn(`Cojudge Cloud could not clean up ${label} image data:`, error);
	}
}

export async function stageSharedCloudAssetSet(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet,
	parts: readonly Uint8Array[]
): Promise<void> {
	const reference = cloudAssetSetRef(db, uid, assetSet);
	// The generation ID and heartbeat let another device distinguish an abandoned
	// staging upload from a live one before reclaiming the content-addressed path.
	const uploadId = makeRevisionId();
	let manifestCreated = false;
	try {
		await setDoc(reference, {
			schemaVersion: CLOUD_ASSET_SET_VERSION,
			status: 'staging',
			assetSetId: assetSet.assetSetId,
			uploadId,
			partCount: assetSet.partCount,
			totalBytes: assetSet.totalBytes,
			checksum: assetSet.checksum,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp()
		});
		manifestCreated = true;
		for (let offset = 0; offset < parts.length; offset += CLOUD_ASSET_BATCH_PARTS) {
			const batch = writeBatch(db);
			for (let index = offset; index < Math.min(parts.length, offset + CLOUD_ASSET_BATCH_PARTS); index++) {
				batch.set(
					doc(
						cloudAssetPartsRef(db, uid, assetSet),
						index.toString().padStart(4, '0')
					),
					{ index, data: Bytes.fromUint8Array(parts[index]), uploadId }
				);
			}
			batch.update(reference, { updatedAt: serverTimestamp() });
			await batch.commit();
		}
		await updateDoc(reference, { status: 'ready', updatedAt: serverTimestamp() });
	} catch (error) {
		if (manifestCreated) {
			const current = await getDoc(reference).catch(() => null);
			if (current?.exists()) {
				const data = current.data();
				if (data.status === 'ready' && cloudAssetManifestMatches(data, assetSet)) return;
				try {
					const currentUpload = sharedAssetUploadState(data);
					if (currentUpload.uploadId === uploadId) {
						const marked = data.status === 'deleting'
							|| await markSharedCloudAssetUploadDeleting(
								db,
								uid,
								assetSet,
								currentUpload
							);
						if (marked) {
							await deleteCloudAssetSetQuietly(db, uid, assetSet, 'an incomplete upload');
						}
					}
				} catch (cleanupError) {
					console.warn('Cojudge Cloud could not abandon an incomplete image upload:', cleanupError);
				}
			}
		}
		throw error;
	}
}

export async function markSharedCloudAssetUploadDeleting(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet,
	expected: { uploadId: string; updatedAt: number }
): Promise<boolean> {
	return runTransaction(db, async (transaction) => {
		const reference = cloudAssetSetRef(db, uid, assetSet);
		const manifest = await transaction.get(reference);
		if (!manifest.exists()) return false;
		const data = manifest.data();
		if (!cloudAssetManifestMatches(data, assetSet)) {
			throw new Error('Cloud image metadata is invalid.');
		}
		const current = sharedAssetUploadState(data);
		if (current.uploadId !== expected.uploadId) return false;
		if (data.status === 'deleting') return true;
		if (data.status !== 'staging' || current.updatedAt !== expected.updatedAt) return false;
		transaction.update(reference, { status: 'deleting', updatedAt: serverTimestamp() });
		return true;
	});
}

export async function waitForSharedCloudAssetSet(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet
): Promise<'ready' | 'absent'> {
	const reference = cloudAssetSetRef(db, uid, assetSet);
	const deadline = Date.now() + CLOUD_ASSET_READY_WAIT_MS;
	let observedUpload = '';
	let unchangedSince = Date.now();
	while (Date.now() < deadline) {
		const result = await getDoc(reference);
		if (!result.exists()) return 'absent';
		const data = result.data();
		if (!cloudAssetManifestMatches(data, assetSet)) {
			throw new Error('An existing cloud image set has invalid metadata.');
		}
		if (data.status === 'ready') return 'ready';
		if (data.status !== 'staging' && data.status !== 'deleting') {
			throw new Error('An existing cloud image set has an invalid status.');
		}

		const upload = sharedAssetUploadState(data);
		if (data.status === 'deleting') {
			// Finish an interrupted collector before this canonical path is reused.
			await deleteCloudAssetSet(db, uid, assetSet).catch(() => undefined);
			observedUpload = '';
			unchangedSince = Date.now();
			await wait(100);
			continue;
		}

		const observation = `${upload.uploadId}:${upload.updatedAt}`;
		if (observation !== observedUpload) {
			observedUpload = observation;
			unchangedSince = Date.now();
		} else if (Date.now() - unchangedSince >= CLOUD_ASSET_STALE_WAIT_MS) {
			const marked = await markSharedCloudAssetUploadDeleting(db, uid, assetSet, upload);
			if (marked) await deleteCloudAssetSet(db, uid, assetSet).catch(() => undefined);
			observedUpload = '';
			unchangedSince = Date.now();
		}
		await wait(500);
	}
	throw new Error('Another device is still preparing or cleaning the same cloud images. Try syncing again shortly.');
}

export async function ensureSharedCloudAssetSet(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet,
	parts: readonly Uint8Array[]
): Promise<boolean> {
	for (let attempt = 0; attempt < 3; attempt++) {
		const state = await waitForSharedCloudAssetSet(db, uid, assetSet);
		if (state === 'ready') return false;
		try {
			await stageSharedCloudAssetSet(db, uid, assetSet, parts);
			return true;
		} catch (error) {
			const raced = await waitForSharedCloudAssetSet(db, uid, assetSet);
			if (raced === 'ready') return false;
			if (attempt === 2) throw error;
		}
	}
	throw new Error('Cojudge Cloud could not prepare image data.');
}

function retainedSnapshotRefs(db: Firestore, uid: string) {
	return Array.from({ length: CLOUD_HISTORY_LIMIT }, (_, index) =>
		snapshotRef(db, uid, `slot-${index}`)
	);
}

export async function markSharedCloudAssetSetDeleting(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet
): Promise<boolean> {
	return runTransaction(db, async (transaction) => {
		const reference = cloudAssetSetRef(db, uid, assetSet);
		const [manifest, snapshots] = await Promise.all([
			transaction.get(reference),
			Promise.all(retainedSnapshotRefs(db, uid).map((snapshot) => transaction.get(snapshot)))
		]);
		if (!manifest.exists()) return false;
		const data = manifest.data();
		if (!cloudAssetManifestMatches(data, assetSet)) {
			throw new Error('Cloud image metadata is invalid.');
		}
		if (snapshots.some((snapshot) => {
			if (!snapshot.exists()) return false;
			const snapshotData = snapshot.data();
			return snapshotData.schemaVersion === CLOUD_SNAPSHOT_VERSION
				&& snapshotData.assetSetId === assetSet.assetSetId;
		})) return false;
		if (data.status === 'deleting') return true;
		if (data.status !== 'ready') return false;
		transaction.update(reference, { status: 'deleting', updatedAt: serverTimestamp() });
		return true;
	});
}

export async function collectSharedCloudAssetSet(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet
): Promise<void> {
	const reference = cloudAssetSetRef(db, uid, assetSet);
	const current = await getDoc(reference);
	if (!current.exists()) return;
	const data = current.data();
	if (!cloudAssetManifestMatches(data, assetSet)) {
		throw new Error('Cloud image metadata is invalid.');
	}
	if (data.status === 'staging') return;
	if (data.status === 'deleting') {
		await deleteCloudAssetSet(db, uid, assetSet);
		return;
	}
	if (data.status !== 'ready') throw new Error('Cloud image metadata is invalid.');
	if (!await markSharedCloudAssetSetDeleting(db, uid, assetSet)) return;
	await deleteCloudAssetSet(db, uid, assetSet);
}

export async function collectSharedCloudAssetSetQuietly(
	db: Firestore,
	uid: string,
	assetSet: CloudAssetSet,
	label: string
): Promise<void> {
	try {
		await collectSharedCloudAssetSet(db, uid, assetSet);
	} catch (error) {
		console.warn(`Cojudge Cloud could not collect ${label} shared image data:`, error);
	}
}

export async function downloadCloudAssetSet(
	db: Firestore,
	uid: string,
	meta: RemoteSnapshotMeta
): Promise<Uint8Array> {
	const assetSet = cloudAssetSet(meta);
	if (!assetSet) return new Uint8Array();

	const manifest = await getDoc(cloudAssetSetRef(db, uid, assetSet));
	const manifestData = manifest.exists() ? manifest.data() : null;
	if (
		!manifestData
		|| manifestData.status !== 'ready'
		|| !cloudAssetManifestMatches(manifestData, assetSet)
	) {
		throw new Error('Cloud image metadata is invalid.');
	}

	const result = await getDocs(
		query(cloudAssetPartsRef(db, uid, assetSet), orderBy('index'))
	);
	if (result.size !== assetSet.partCount) throw new Error('Cloud image download is incomplete.');
	const sharedUploadId = assetSet.storage === 'shared'
		? sharedAssetUploadState(manifestData).uploadId
		: null;
	const parts = result.docs.map((part, index) => {
		const data = part.data();
		if (
			data.index !== index
			|| !(data.data instanceof Bytes)
			|| (sharedUploadId !== null && data.uploadId !== sharedUploadId)
		) {
			throw new Error('Cloud image download contains an invalid part.');
		}
		return data.data.toUint8Array();
	});
	const bytes = decodeCloudAssetParts(parts, assetSet.totalBytes);
	if ((await hashCloudAssetBytes(bytes)) !== assetSet.checksum) {
		throw new Error('Cloud images failed their integrity check.');
	}
	return bytes;
}


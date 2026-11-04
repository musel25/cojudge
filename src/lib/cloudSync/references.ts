import { collection, doc, type Firestore } from 'firebase/firestore/lite';
import type { CloudAssetSet } from './metadata';

export function latestRef(db: Firestore, uid: string) {
	return doc(db, 'users', uid, 'cloud', 'latest');
}

export function snapshotRef(db: Firestore, uid: string, snapshotId: string) {
	return doc(db, 'users', uid, 'snapshots', snapshotId);
}

export function partsRef(db: Firestore, uid: string, snapshotId: string) {
	return collection(db, 'users', uid, 'snapshots', snapshotId, 'parts');
}

export function revisionAssetSetRef(db: Firestore, uid: string, snapshotId: string, revisionId: string) {
	return doc(db, 'users', uid, 'snapshots', snapshotId, 'assetSets', revisionId);
}

export function revisionAssetPartsRef(db: Firestore, uid: string, snapshotId: string, revisionId: string) {
	return collection(
		db,
		'users',
		uid,
		'snapshots',
		snapshotId,
		'assetSets',
		revisionId,
		'parts'
	);
}

export function sharedAssetSetRef(db: Firestore, uid: string, assetSetId: string) {
	return doc(db, 'users', uid, 'cloudAssets', assetSetId);
}

export function sharedAssetPartsRef(db: Firestore, uid: string, assetSetId: string) {
	return collection(db, 'users', uid, 'cloudAssets', assetSetId, 'parts');
}

export function cloudAssetSetRef(db: Firestore, uid: string, assetSet: CloudAssetSet) {
	return assetSet.storage === 'shared'
		? sharedAssetSetRef(db, uid, assetSet.assetSetId)
		: revisionAssetSetRef(db, uid, assetSet.snapshotId!, assetSet.assetSetId);
}

export function cloudAssetPartsRef(db: Firestore, uid: string, assetSet: CloudAssetSet) {
	return assetSet.storage === 'shared'
		? sharedAssetPartsRef(db, uid, assetSet.assetSetId)
		: revisionAssetPartsRef(db, uid, assetSet.snapshotId!, assetSet.assetSetId);
}


// Snapshot validation is independent of authentication, UI state, and Firestore I/O.
import { CLOUD_SNAPSHOT_LEGACY_VERSION, CLOUD_SNAPSHOT_SIDECAR_VERSION, CLOUD_SNAPSHOT_VERSION } from '../progressBackup';
import { CLOUD_ASSET_CHUNK_BYTES, MAX_CLOUD_ASSET_BYTES, MAX_CLOUD_ASSET_PARTS } from '../cloudAssets';

export const MAX_SNAPSHOT_BYTES = 6 * 1024 * 1024;
export const MAX_SNAPSHOT_PARTS = 12;
export const CLOUD_ASSET_SET_VERSION = 1;

export type RemoteSnapshotMeta = {
	schemaVersion: number;
	snapshotId: string;
	revisionId: string;
	parentRevisionId: string | null;
	checksum: string;
	payloadChecksum: string;
	partCount: number;
	totalBytes: number;
	assetStorage: 'none' | 'revision' | 'shared';
	assetSetId: string | null;
	assetPartCount: number;
	assetBytes: number;
	assetChecksum: string | null;
	updatedAt: number;
	meaningful: boolean;
};

export type CloudAssetSet = {
	storage: 'revision' | 'shared';
	snapshotId: string | null;
	assetSetId: string;
	partCount: number;
	totalBytes: number;
	checksum: string;
};

export function integer(value: unknown, minimum: number, maximum: number, label: string): number {
	if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
		throw new Error(`Cloud snapshot has an invalid ${label}.`);
	}
	return value as number;
}

export function timestampMillis(data: Record<string, unknown>, key: string): number {
	const value = data[key] as { toMillis?: () => number } | undefined;
	const timestamp = value?.toMillis?.() ?? 0;
	if (!Number.isFinite(timestamp) || timestamp <= 0) {
		throw new Error('Cloud snapshot has no valid update time.');
	}
	return timestamp;
}

export function validSnapshotId(value: string): boolean {
	return /^slot-[0-4]$/.test(value) || /^[a-z0-9-]{8,100}$/i.test(value);
}

export function validRevisionId(value: string): boolean {
	return /^[a-z0-9-]{8,100}$/i.test(value);
}

export function parseSnapshotMeta(
	snapshotId: string,
	data: Record<string, unknown>,
	timestampKey: 'updatedAt' | 'createdAt'
): RemoteSnapshotMeta {
	const schemaVersion = data.schemaVersion;
	const revisionId = typeof data.revisionId === 'string' ? data.revisionId : snapshotId;
	const parentRevisionId = typeof data.parentRevisionId === 'string' ? data.parentRevisionId : null;
	const checksum = typeof data.checksum === 'string' ? data.checksum : '';
	if (
		(
			schemaVersion !== CLOUD_SNAPSHOT_LEGACY_VERSION
			&& schemaVersion !== CLOUD_SNAPSHOT_SIDECAR_VERSION
			&& schemaVersion !== CLOUD_SNAPSHOT_VERSION
		) ||
		!validSnapshotId(snapshotId) ||
		!validRevisionId(revisionId) ||
		(parentRevisionId !== null && !validRevisionId(parentRevisionId)) ||
		!/^[a-f0-9]{64}$/.test(checksum)
	) {
		throw new Error('Cloud snapshot metadata is invalid.');
	}

	let payloadChecksum = checksum;
	let assetStorage: RemoteSnapshotMeta['assetStorage'] = 'none';
	let assetSetId: string | null = null;
	let assetPartCount = 0;
	let assetBytes = 0;
	let assetChecksum: string | null = null;
	if (schemaVersion !== CLOUD_SNAPSHOT_LEGACY_VERSION) {
		payloadChecksum = typeof data.payloadChecksum === 'string' ? data.payloadChecksum : '';
		assetPartCount = integer(data.assetPartCount, 0, MAX_CLOUD_ASSET_PARTS, 'image part count');
		assetBytes = integer(data.assetBytes, 0, MAX_CLOUD_ASSET_BYTES, 'image size');
		const expectedPartCount = assetBytes === 0 ? 0 : Math.ceil(assetBytes / CLOUD_ASSET_CHUNK_BYTES);
		if (!/^[a-f0-9]{64}$/.test(payloadChecksum) || assetPartCount !== expectedPartCount) {
			throw new Error('Cloud snapshot image metadata is invalid.');
		}

		if (schemaVersion === CLOUD_SNAPSHOT_SIDECAR_VERSION) {
			const assetRevisionId = typeof data.assetRevisionId === 'string' ? data.assetRevisionId : null;
			assetChecksum = typeof data.assetChecksum === 'string' ? data.assetChecksum : null;
			if (assetPartCount === 0
				? assetRevisionId !== null || assetChecksum !== null
				: assetRevisionId !== revisionId || !assetChecksum || !/^[a-f0-9]{64}$/.test(assetChecksum)) {
				throw new Error('Cloud snapshot image metadata is invalid.');
			}
			if (assetPartCount > 0) {
				assetStorage = 'revision';
				assetSetId = assetRevisionId;
			}
		} else {
			const sharedAssetSetId = typeof data.assetSetId === 'string' ? data.assetSetId : null;
			if (assetPartCount === 0
				? sharedAssetSetId !== null
				: !sharedAssetSetId || !/^[a-f0-9]{64}$/.test(sharedAssetSetId)) {
				throw new Error('Cloud snapshot image metadata is invalid.');
			}
			if (assetPartCount > 0) {
				assetStorage = 'shared';
				assetSetId = sharedAssetSetId;
				assetChecksum = sharedAssetSetId;
			}
		}
	}

	return {
		schemaVersion: schemaVersion as number,
		snapshotId,
		revisionId,
		parentRevisionId,
		checksum,
		payloadChecksum,
		partCount: integer(data.partCount, 1, MAX_SNAPSHOT_PARTS, 'part count'),
		totalBytes: integer(data.totalBytes, 0, MAX_SNAPSHOT_BYTES, 'size'),
		assetStorage,
		assetSetId,
		assetPartCount,
		assetBytes,
		assetChecksum,
		updatedAt: timestampMillis(data, timestampKey),
		meaningful: data.meaningful === true
	};
}

export function parseRemoteMeta(data: Record<string, unknown>): RemoteSnapshotMeta {
	const snapshotId = typeof data.snapshotId === 'string' ? data.snapshotId : '';
	return parseSnapshotMeta(snapshotId, data, 'updatedAt');
}

export function parseHistoryMeta(snapshotId: string, data: Record<string, unknown>): RemoteSnapshotMeta | null {
	try {
		if (data.status !== 'ready') return null;
		return parseSnapshotMeta(snapshotId, data, 'createdAt');
	} catch {
		return null;
	}
}

export function makeRevisionId(): string {
	const random = crypto.randomUUID?.() ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
	return `${Date.now().toString(36)}-${random.replaceAll('-', '')}`;
}

export function cloudAssetSet(meta: RemoteSnapshotMeta | null): CloudAssetSet | null {
	if (!meta?.assetSetId || meta.assetPartCount === 0 || !meta.assetChecksum) return null;
	return {
		storage: meta.assetStorage === 'shared' ? 'shared' : 'revision',
		snapshotId: meta.assetStorage === 'revision' ? meta.snapshotId : null,
		assetSetId: meta.assetSetId,
		partCount: meta.assetPartCount,
		totalBytes: meta.assetBytes,
		checksum: meta.assetChecksum
	};
}

export function cloudAssetManifestMatches(data: Record<string, unknown>, assetSet: CloudAssetSet): boolean {
	return data.schemaVersion === CLOUD_ASSET_SET_VERSION
		&& data.partCount === assetSet.partCount
		&& data.totalBytes === assetSet.totalBytes
		&& data.checksum === assetSet.checksum
		&& (assetSet.storage === 'shared'
			? data.assetSetId === assetSet.assetSetId
				&& typeof data.uploadId === 'string'
				&& validRevisionId(data.uploadId)
			: data.snapshotId === assetSet.snapshotId && data.revisionId === assetSet.assetSetId);
}

export function sharedAssetUploadState(data: Record<string, unknown>): { uploadId: string; updatedAt: number } {
	const uploadId = typeof data.uploadId === 'string' ? data.uploadId : '';
	const timestamp = data.updatedAt as { toMillis?: () => number } | undefined;
	const updatedAt = timestamp?.toMillis?.() ?? 0;
	if (!validRevisionId(uploadId) || !Number.isFinite(updatedAt) || updatedAt <= 0) {
		throw new Error('Cloud image upload metadata is invalid.');
	}
	return { uploadId, updatedAt };
}


// Account-scoped cache parsing and referenced-image selection for local snapshots.
import type { ProgressData } from '../progressBackup';
import { PASTED_IMAGES_KEY, findPastedImageLinks, parsePastedImageLink, getAllPastedImages } from '../utils/imageStore';

export type CloudCloneRecord = {
	accountId: string;
	checksum: string;
	revisionId: string | null;
	serialized: string;
};

export function cloudAccountId(projectId: string, uid: string): string {
	return JSON.stringify([projectId, uid]);
}

export function parseCloudCloneRecord(raw: string | null): CloudCloneRecord | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Partial<CloudCloneRecord>;
		if (
			typeof parsed.accountId !== 'string'
			|| typeof parsed.checksum !== 'string'
			|| typeof parsed.serialized !== 'string'
			|| (parsed.revisionId !== null && typeof parsed.revisionId !== 'string' && parsed.revisionId !== undefined)
		) {
			return null;
		}
		return {
			accountId: parsed.accountId,
			checksum: parsed.checksum,
			revisionId: typeof parsed.revisionId === 'string' ? parsed.revisionId : null,
			serialized: parsed.serialized
		};
	} catch {
		return null;
	}
}

export function referencedPastedImageIds(filesValue: unknown): Set<string> {
	const ids = new Set<string>();
	if (filesValue && typeof filesValue === 'object' && !Array.isArray(filesValue)) {
		for (const serialized of Object.values(filesValue)) {
			if (typeof serialized !== 'string') continue;
			let entries: unknown;
			try {
				entries = JSON.parse(serialized);
			} catch {
				continue;
			}
			if (!Array.isArray(entries)) continue;
			for (const entry of entries) {
				if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
				const file = entry as Record<string, unknown>;
				if (file.language !== 'markdown' || typeof file.content !== 'string') continue;
				for (const link of findPastedImageLinks(file.content)) {
					const id = parsePastedImageLink(link);
					if (id) ids.add(id);
				}
			}
		}
	}
	return ids;
}

// Collects the IndexedDB-backed pasted images referenced by markdown file
// contents, as { [id]: dataUrl }. Returns null when none are referenced so the
// snapshot stays image-free (and checksums unchanged) for image-less documents.
export async function collectReferencedPastedImages(filesValue: unknown): Promise<Record<string, string> | null> {
	const ids = referencedPastedImageIds(filesValue);
	if (ids.size === 0) return null;

	const all = await getAllPastedImages();
	const record: Record<string, string> = {};
	const missing: string[] = [];
	for (const id of ids) {
		const dataUrl = all[id];
		if (dataUrl) record[id] = dataUrl;
		else missing.push(id);
	}
	if (missing.length > 0) {
		throw new Error(
			`${missing.length} pasted ${missing.length === 1 ? 'image is' : 'images are'} unavailable locally. Remove or paste ${missing.length === 1 ? 'it' : 'them'} again before syncing.`
		);
	}
	return Object.keys(record).length > 0 ? record : null;
}

export function retainReferencedPastedImages(
	data: ProgressData,
	sources: Array<Record<string, string> | null>
): ProgressData {
	const result = { ...data };
	const images: Record<string, string> = {};
	for (const id of referencedPastedImageIds(result.files)) {
		for (const source of sources) {
			const dataUrl = source?.[id];
			if (!dataUrl) continue;
			images[id] = dataUrl;
			break;
		}
	}
	if (Object.keys(images).length > 0) result[PASTED_IMAGES_KEY] = images;
	else delete result[PASTED_IMAGES_KEY];
	return result;
}


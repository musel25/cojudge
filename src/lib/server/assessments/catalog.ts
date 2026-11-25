import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getContentRoot } from '$lib/server/contentPaths';
import { resolveProgressProfile } from '$lib/server/progressProfiles';
import { AssessmentStore } from './attempts';
import { isLocalAssessmentClient } from './access';
import { MAX_PACK_BYTES, packId, parsePack } from './schema';

const bundled = import.meta.glob<unknown>('/assessments/*/pack.json', { eager: true, import: 'default' });

export function assessmentContext({ request, url, getClientAddress }: { request: Request; url: URL; getClientAddress: () => string }) {
	if (env.IS_DEMO_SITE === 'true') error(404, 'Assessments are available in local Cojudge.');
	if (env.COJUDGE_SERVER_PROGRESS_OWNER || env.COJUDGE_SERVER_PROGRESS_USERS) {
		try {
			const directory = env.COJUDGE_SERVER_PROGRESS_DIR;
			if (!directory) throw new Error('Missing profile directory.');
			const profile = resolveProgressProfile(request.headers, {
				directory, owner: env.COJUDGE_SERVER_PROGRESS_OWNER || '', users: env.COJUDGE_SERVER_PROGRESS_USERS || ''
			});
			return { profile: profile.id, store: new AssessmentStore(join(profile.directory, 'assessments')) };
		} catch {
			error(403, 'An authenticated Cojudge profile is required.');
		}
	}
	if (!isLocalAssessmentClient(url.hostname, getClientAddress())) {
		error(403, 'Open this assessment on the local device or sign in to a configured profile.');
	}
	return { profile: 'local', store: new AssessmentStore(join(getContentRoot(), 'assessment-progress')) };
}

async function readCustom(slug: string): Promise<unknown> {
	const file = await open(join(getContentRoot(), 'assessments', slug, 'pack.json'), 'r').catch(
		(error: NodeJS.ErrnoException) => {
			if (error.code === 'ENOENT') return null;
			throw error;
		}
	);
	if (!file) return undefined;
	try {
		const buffer = Buffer.alloc(MAX_PACK_BYTES + 1);
		const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
		if (bytesRead > MAX_PACK_BYTES) throw new Error('Assessment pack is too large.');
		return JSON.parse(buffer.toString('utf8', 0, bytesRead));
	} finally {
		await file.close();
	}
}

export async function loadPack(slug: string) {
	if (slug.length > 80 || !packId.test(slug)) return null;
	const custom = await readCustom(slug);
	const raw = custom === undefined ? bundled[`/assessments/${slug}/pack.json`] : custom;
	if (raw === undefined) return null;
	const pack = parsePack(raw);
	if (pack.id !== slug) throw new Error('Assessment ID must match its directory name.');
	return pack;
}

export async function catalog() {
	const custom = await readdir(join(getContentRoot(), 'assessments'), { withFileTypes: true }).catch(
		(error: NodeJS.ErrnoException) => {
			if (error.code === 'ENOENT') return [];
			throw error;
		}
	);
	const ids = new Set([
		...Object.keys(bundled).map((path) => path.split('/')[2]),
		...custom.filter((item) => item.isDirectory()).map((item) => item.name)
	]);
	const entries = await Promise.all([...ids].sort().map(async (id) => {
		try {
			const pack = await loadPack(id);
			return pack && { id: pack.id, title: pack.title, summary: pack.summary, invalid: false };
		} catch {
			return { id, title: id, summary: 'Check the version 1 problem pack.', invalid: true };
		}
	}));
	return entries.filter((entry) => entry !== null);
}

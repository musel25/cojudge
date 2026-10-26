import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { resolveProgressProfile } from '$lib/server/progressProfiles';

export const load: LayoutServerLoad = async ({ request }) => {
  let profile: { id: string; name: string } | null = null;
  if (env.COJUDGE_SERVER_PROGRESS_OWNER || env.COJUDGE_SERVER_PROGRESS_USERS) {
    try {
      const resolved = resolveProgressProfile(request.headers, { directory: env.COJUDGE_SERVER_PROGRESS_DIR || '',
        owner: env.COJUDGE_SERVER_PROGRESS_OWNER || '', users: env.COJUDGE_SERVER_PROGRESS_USERS || '' });
      profile = { id: resolved.id, name: resolved.name };
    } catch { error(403, 'An authenticated CoJudge profile is required.'); }
  }
  return {
    isDemoSite: env.IS_DEMO_SITE === 'true',
    serverProgressEnabled: Boolean(env.COJUDGE_SERVER_PROGRESS_DIR && env.COJUDGE_SERVER_PROGRESS_ORIGIN),
    progressProfile: profile,
    progressOwner: env.COJUDGE_SERVER_PROGRESS_OWNER || null
  };
};

import { env } from '$env/dynamic/private';
import { ProgressRepository, handleProgressRequest } from '$lib/server/serverProgress';
import { authorizeProfileRequest } from '$lib/server/progressProfiles';
import type { RequestHandler } from './$types';

const repositories = new Map<string, ProgressRepository>();
const handler: RequestHandler = async ({ request }) => {
  if (!env.COJUDGE_SERVER_PROGRESS_DIR || !env.COJUDGE_SERVER_PROGRESS_ORIGIN) {
    return new Response('Server progress is disabled.', { status: 404 });
  }
  let directory = env.COJUDGE_SERVER_PROGRESS_DIR;
  let profileId: string | null = null;
  if (env.COJUDGE_SERVER_PROGRESS_OWNER || env.COJUDGE_SERVER_PROGRESS_USERS) {
    try {
      const profile = authorizeProfileRequest(request.headers, { directory,
        owner: env.COJUDGE_SERVER_PROGRESS_OWNER || '', users: env.COJUDGE_SERVER_PROGRESS_USERS || '' });
      directory = profile.directory;
      profileId = profile.id;
    } catch {
      return new Response('Profile changed or authentication is missing. Reload before saving.', {
        status: 403, headers: { 'Cache-Control': 'no-store' }
      });
    }
  }
  let repository = repositories.get(directory);
  if (!repository) { repository = new ProgressRepository(directory); repositories.set(directory, repository); }
  const response = await handleProgressRequest(request, repository, env.COJUDGE_SERVER_PROGRESS_ORIGIN);
  if (profileId) response.headers.set('X-CoJudge-Profile', profileId);
  return response;
};
export const GET = handler;
export const PUT = handler;

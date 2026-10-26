import { env } from '$env/dynamic/private';
import { ProgressRepository, handleProgressRequest } from '$lib/server/serverProgress';
import type { RequestHandler } from './$types';

let repository: ProgressRepository | undefined;
const handler: RequestHandler = ({ request }) => {
  if (!env.COJUDGE_SERVER_PROGRESS_DIR || !env.COJUDGE_SERVER_PROGRESS_ORIGIN) {
    return new Response('Server progress is disabled.', { status: 404 });
  }
  repository ??= new ProgressRepository(env.COJUDGE_SERVER_PROGRESS_DIR);
  return handleProgressRequest(request, repository, env.COJUDGE_SERVER_PROGRESS_ORIGIN);
};
export const GET = handler;
export const PUT = handler;

import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => ({
  isDemoSite: env.IS_DEMO_SITE === 'true',
  serverProgressEnabled: Boolean(env.COJUDGE_SERVER_PROGRESS_DIR && env.COJUDGE_SERVER_PROGRESS_ORIGIN)
});

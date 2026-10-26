import { env } from '$env/dynamic/private';

export function load() {
  return { serverProgressEnabled: Boolean(env.COJUDGE_SERVER_PROGRESS_DIR && env.COJUDGE_SERVER_PROGRESS_ORIGIN) };
}

import { join } from 'node:path';

export type ProfileConfig = { directory: string; owner: string; users: string };
export type ProgressProfile = { id: string; name: string; directory: string };
const validId = /^[a-z][a-z0-9_-]{0,31}$/;

export function resolveProgressProfile(headers: Headers, config: ProfileConfig): ProgressProfile {
  const users = config.users.split(',').map(value => value.trim());
  if (!validId.test(config.owner) || !users.includes(config.owner) || users.some(id => !validId.test(id))) {
    throw new Error('Invalid profile configuration.');
  }
  const id = headers.get('x-cojudge-user') || '';
  if (!validId.test(id) || !users.includes(id)) throw new Error('Authenticated profile required.');
  const names: Record<string, string> = { musel: 'Müsel', alessa: 'Alessa' };
  return {
    id, name: names[id] || id,
    directory: id === config.owner ? config.directory : join(config.directory, 'profiles', id)
  };
}

export function authorizeProfileRequest(headers: Headers, config: ProfileConfig): ProgressProfile {
  const profile = resolveProgressProfile(headers, config);
  if (headers.get('x-cojudge-profile') !== profile.id) throw new Error('Profile changed. Reload before saving.');
  return profile;
}

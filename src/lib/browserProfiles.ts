import { normalizeProgress, PROGRESS_KEYS, validateSnapshot } from './serverProgressData';
import { BASELINE_KEY } from './serverProgressClient';

export const ACTIVE_PROFILE_KEY = 'cojudge-vps-active-profile';
type ProfileStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const cacheKey = (id: string) => `cojudge-vps-profile-cache-${id}`;

export function assertCurrentProfile(storage: Pick<Storage, 'getItem'>, id: string, response?: Headers): void {
  if (storage.getItem(ACTIVE_PROFILE_KEY) !== id || (response && response.get('x-cojudge-profile') !== id)) {
    throw new Error('The login profile changed. Reload before saving.');
  }
}

// Call inside withServerRestore when the identity changes, before rendering
// any learner page. Old tabs are invalidated by the restore epoch.
export function switchBrowserProfile(storage: ProfileStorage, incomingId: string, ownerId: string): boolean {
  const outgoingId = storage.getItem(ACTIVE_PROFILE_KEY) || ownerId;
  if (outgoingId === incomingId) {
    storage.setItem(ACTIVE_PROFILE_KEY, incomingId);
    return false;
  }
  const outgoing = normalizeProgress(Object.fromEntries(PROGRESS_KEYS.map(key => [key, JSON.parse(storage.getItem(key) || '{}')])));
  const oldBaseline = storage.getItem(BASELINE_KEY);
  const raw = storage.getItem(cacheKey(incomingId));
  const cache = raw ? JSON.parse(raw) : { data: {}, baseline: null };
  const incoming = normalizeProgress(cache.data);
  if (cache.baseline !== null) {
    if (typeof cache.baseline !== 'string') throw new Error('Invalid profile cache.');
    validateSnapshot(JSON.parse(cache.baseline));
  }
  // A quota failure here leaves all live data untouched.
  storage.setItem(cacheKey(outgoingId), JSON.stringify({ data: outgoing, baseline: oldBaseline }));
  const keys = [...PROGRESS_KEYS, BASELINE_KEY, ACTIVE_PROFILE_KEY];
  const previous = new Map(keys.map(key => [key, storage.getItem(key)]));
  try {
    if (cache.baseline === null) storage.removeItem(BASELINE_KEY);
    else storage.setItem(BASELINE_KEY, cache.baseline);
    storage.setItem(ACTIVE_PROFILE_KEY, incomingId);
    for (const [key, value] of Object.entries(incoming)) storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    for (const key of keys) storage.removeItem(key);
    for (const [key, value] of previous) if (value !== null) storage.setItem(key, value);
    throw error;
  }
  return true;
}

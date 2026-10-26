// A restore invalidates every open editor on this browser origin. Old editor
// teardown must not save its in-memory tabs over the restored file collection.
const EPOCH_KEY = 'cojudge-vps-restore-epoch';
const LOCK_KEY = 'cojudge-vps-restore-lock';
const initialEpoch = typeof localStorage === 'undefined' ? null : localStorage.getItem(EPOCH_KEY);
let reloadScheduled = false;

export function serverRestorePending(): boolean {
  if (typeof window === 'undefined') return false;
  const lock = Number(localStorage.getItem(LOCK_KEY));
  return (lock > 0 && Date.now() - lock < 10000) || localStorage.getItem(EPOCH_KEY) !== initialEpoch;
}

export function reloadAfterServerRestore(): void {
  if (reloadScheduled || typeof window === 'undefined') return;
  reloadScheduled = true;
  const reload = () => {
    const lock = Number(localStorage.getItem(LOCK_KEY));
    if (lock > 0 && Date.now() - lock < 10000) setTimeout(reload, 50);
    else window.location.reload();
  };
  setTimeout(reload, 0);
}

export function withServerRestore(restore: () => void): void {
  const previousEpoch = localStorage.getItem(EPOCH_KEY);
  localStorage.setItem(LOCK_KEY, String(Date.now()));
  try {
    localStorage.setItem(EPOCH_KEY, crypto.randomUUID());
    restore();
  } catch (error) {
    if (previousEpoch === null) localStorage.removeItem(EPOCH_KEY);
    else localStorage.setItem(EPOCH_KEY, previousEpoch);
    throw error;
  } finally {
    localStorage.removeItem(LOCK_KEY);
  }
  reloadAfterServerRestore();
}

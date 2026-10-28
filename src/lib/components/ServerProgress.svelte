<script lang="ts">
  import { onMount } from 'svelte';
  import { ProgressSync, type SyncStatus } from '$lib/serverProgressClient';
  import { validateSnapshot, PROGRESS_KEYS } from '$lib/serverProgressData';
  import { applyProgressData } from '$lib/progressBackupClient';
  import { flushProgressStorageWrites } from '$lib/progressBackup';
  import { withServerRestore, serverRestorePending, reloadAfterServerRestore } from '$lib/serverProgressRestore';
  import { ACTIVE_PROFILE_KEY, switchBrowserProfile, assertCurrentProfile } from '$lib/browserProfiles';

  let status = $state<SyncStatus>({ state: 'connecting' });
  let { onReady, profile = null, owner = null }: {
    onReady: () => void; profile?: { id: string; name: string } | null; owner?: string | null
  } = $props();
  let sync: ProgressSync;
  let runAction = async (action: () => Promise<void>) => { await action(); };

  onMount(() => {
    let stopped = false;
    let cleanup = () => {};
    const lifecycle = new AbortController();
    async function initialize() {
    const profileId = profile?.id;
    if (profileId && owner) {
      try {
        if (!navigator.locks) throw new Error('This browser needs secure browser-lock support to load a profile.');
        await navigator.locks.request('cojudge-profile-state', { signal: lifecycle.signal }, () => {
          if (stopped) return;
          const outgoingId = localStorage.getItem(ACTIVE_PROFILE_KEY) || owner;
          if (outgoingId !== profileId) withServerRestore(() => switchBrowserProfile(localStorage, profileId, owner!));
          else switchBrowserProfile(localStorage, profileId, owner!);
        });
        if (serverRestorePending()) { reloadAfterServerRestore(); return; }
      } catch (error) {
        if (!stopped) status = { state: 'error', message: error instanceof Error ? error.message : 'Could not load profile.' };
        return;
      }
    }
    if (stopped) return;
    const identityHeaders: Record<string, string> = profileId ? { 'X-CoJudge-Profile': profileId } : {};
    const checkIdentity = (response?: Headers) => { if (profileId) assertCurrentProfile(localStorage, profileId, response); };
    runAction = async (action) => {
      try {
        if (profileId) {
          await navigator.locks.request('cojudge-profile-state', { signal: lifecycle.signal }, async () => {
            if (stopped) return;
            if (serverRestorePending()) { reloadAfterServerRestore(); return; }
            checkIdentity();
            await action();
          });
        } else await action();
      } catch (error) {
        if (!stopped) status = { state: 'error', message: error instanceof Error ? error.message : 'Could not save profile.' };
      }
    };
    async function responseData(response: Response) {
      if (!response.ok && response.status !== 409) throw new Error(`Server unavailable (${response.status}). Changes remain in this browser.`);
      checkIdentity(response.headers);
      return validateSnapshot(await response.json());
    }
    sync = new ProgressSync({
      storage: localStorage,
      get: async () => {
        checkIdentity();
        const snapshot = await responseData(await fetch('/api/server-progress', { headers: identityHeaders, cache: 'no-store', signal: AbortSignal.timeout(10000) }));
        checkIdentity();
        return snapshot;
      },
      put: async (baseRevision, data) => {
        checkIdentity();
        const response = await fetch('/api/server-progress', {
          method: 'PUT', headers: { ...identityHeaders, 'Content-Type': 'application/json', 'X-CoJudge-Sync': '1' },
          body: JSON.stringify({ baseRevision, data }), signal: AbortSignal.timeout(10000)
        });
        const snapshot = await responseData(response);
        checkIdentity();
        return { conflict: response.status === 409, snapshot };
      },
      apply: data => withServerRestore(() => applyProgressData(data)),
      status: value => { status = serverRestorePending() ? { state: 'connecting' } : value; }
    });
    let checking = false;
    const check = () => {
      if (serverRestorePending()) { reloadAfterServerRestore(); return; }
      if (checking) return;
      checking = true;
      void runAction(() => sync.tick()).finally(() => { checking = false; });
    };
    const changed = (event: Event) => {
      const key = (event as CustomEvent<string>).detail;
      if (!(PROGRESS_KEYS as readonly string[]).includes(key)) return;
      if (status.state === 'saved') status = { ...status, state: 'pending' };
      clearTimeout(debounce);
      debounce = setTimeout(check, 500);
    };
    let debounce: ReturnType<typeof setTimeout>;
    const leaving = () => { flushProgressStorageWrites(); check(); };
    // Polling also covers imports, deletes, and writes from other tabs that
    // bypass the normal persistence helper.
    const timer = setInterval(check, 3000);
    window.addEventListener('cojudge:progress-written', changed);
    window.addEventListener('online', check);
    window.addEventListener('storage', check);
    window.addEventListener('pagehide', leaving);
    document.addEventListener('visibilitychange', leaving);
    void runAction(() => sync.tick()).finally(() => {
      if (stopped) return;
      if (serverRestorePending()) reloadAfterServerRestore();
      else onReady();
    });
    cleanup = () => {
      clearTimeout(debounce); clearInterval(timer);
      window.removeEventListener('cojudge:progress-written', changed);
      window.removeEventListener('online', check);
      window.removeEventListener('storage', check);
      window.removeEventListener('pagehide', leaving);
      document.removeEventListener('visibilitychange', leaving);
    };
    }
    void initialize();
    return () => { stopped = true; lifecycle.abort(); cleanup(); };
  });
</script>

{#if status.state === 'error' || status.state === 'conflict'}
<aside class="server-progress" aria-label="Server save status">
    <div class="details">
      <p>{status.state === 'conflict' ? 'Server save needs review' : 'VPS save failed — local copy kept'}</p>
      {#if status.message}<p>{status.message}</p>{/if}
      {#if status.state === 'conflict'}
        <button onclick={() => runAction(() => sync.useServer())}>Use server copy</button>
        <button onclick={() => runAction(() => sync.useBrowser())}>Save this browser copy</button>
        <p>The replaced server copy stays in server history. Before a restore, this browser copy is kept in local recovery storage.</p>
      {:else if status.state === 'error'}<button onclick={() => sync ? runAction(() => sync.tick()) : window.location.reload()}>Retry save</button>{/if}
    </div>
</aside>
{/if}

<style>
  .server-progress { position: fixed; bottom: 5px; right: 16px; z-index: 200; max-width: min(380px, calc(100vw - 32px)); border: 1px solid #e4b45b; border-radius: 8px; background: #142330; color: #e6f0f6; box-shadow: 0 2px 8px #0003; font-size: 12px; }
  button { cursor: pointer; color: inherit; background: transparent; border: 1px solid #667c8d; border-radius: 4px; padding: 6px 9px; margin: 3px; font: inherit; }
  .details { padding: 0 11px 10px; }
  p { margin: 7px 0; line-height: 1.5; }
</style>

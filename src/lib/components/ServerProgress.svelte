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
  let details = $state(false);

  onMount(() => {
    const profileId = profile?.id;
    if (profileId && owner) {
      try {
        const outgoingId = localStorage.getItem(ACTIVE_PROFILE_KEY) || owner;
        if (outgoingId !== profileId) {
          withServerRestore(() => switchBrowserProfile(localStorage, profileId, owner!));
          return;
        }
        switchBrowserProfile(localStorage, profileId, owner);
      } catch (error) {
        status = { state: 'error', message: error instanceof Error ? error.message : 'Could not load profile.' };
        return;
      }
    }
    const identityHeaders: Record<string, string> = profileId ? { 'X-CoJudge-Profile': profileId } : {};
    const checkIdentity = (response?: Headers) => { if (profileId) assertCurrentProfile(localStorage, profileId, response); };
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
    const check = () => {
      if (serverRestorePending()) { reloadAfterServerRestore(); return; }
      void sync.tick();
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
    void sync.tick().finally(() => {
      if (serverRestorePending()) reloadAfterServerRestore();
      else onReady();
    });
    return () => {
      clearTimeout(debounce); clearInterval(timer);
      window.removeEventListener('cojudge:progress-written', changed);
      window.removeEventListener('online', check);
      window.removeEventListener('storage', check);
      window.removeEventListener('pagehide', leaving);
      document.removeEventListener('visibilitychange', leaving);
    };
  });
</script>

<aside class="server-progress" class:attention={status.state === 'error' || status.state === 'conflict'} aria-label="Server save status">
  {#if profile}<span class="profile-name" aria-label="Current profile">{profile.name}</span>{/if}
  <button class="status-button" onclick={() => details = !details} aria-expanded={details}>
    {#if status.state === 'saved'}✓ Saved to VPS
    {:else if status.state === 'saving'}Saving to VPS…
    {:else if status.state === 'pending'}Waiting to save to VPS…
    {:else if status.state === 'conflict'}Server save needs review
    {:else if status.state === 'error'}VPS save failed — local copy kept
    {:else}Connecting to VPS…{/if}
  </button>
  {#if details || status.state === 'error' || status.state === 'conflict'}
    <div class="details">
      <p>Code, files, completed problems, bookmarks, custom tests and game results are saved on this VPS.</p>
      {#if status.savedAt}<p>Last server save: {new Date(status.savedAt).toLocaleString()}</p>{/if}
      {#if status.message}<p>{status.message}</p>{/if}
      {#if status.state === 'conflict'}
        <button onclick={() => sync.useServer()}>Use server copy</button>
        <button onclick={() => sync.useBrowser()}>Save this browser copy</button>
        <p>The replaced server copy stays in server history. Before a restore, this browser copy is kept in local recovery storage.</p>
      {:else if status.state === 'error'}<button onclick={() => sync ? sync.tick() : window.location.reload()}>Retry save</button>{/if}
    </div>
  {/if}
</aside>

<style>
  .server-progress { position: fixed; bottom: 5px; right: 16px; z-index: 200; max-width: min(380px, calc(100vw - 32px)); border: 1px solid #38566b; border-radius: 8px; background: #142330; color: #e6f0f6; box-shadow: 0 2px 8px #0003; font-size: 12px; }
  .attention { border-color: #e4b45b; }
  button { cursor: pointer; color: inherit; background: transparent; border: 1px solid #667c8d; border-radius: 4px; padding: 6px 9px; margin: 3px; font: inherit; }
  .status-button { border: 0; margin: 0; padding: 7px 11px; }
  .profile-name { padding-left: 11px; font-weight: 600; }
  .details { padding: 0 11px 10px; }
  p { margin: 7px 0; line-height: 1.5; }
</style>

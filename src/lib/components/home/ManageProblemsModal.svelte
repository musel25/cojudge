<script lang="ts">
    import { onDestroy } from 'svelte';

    export let open = false;
    export let contentDir: string;
    export let card: HTMLElement | null = null;
    export let onClose: () => void | Promise<void>;

    let manageProblemsError = '';
    let revealingFolder = false;
    let pathCopied = false;
    let pathCopiedTimer: ReturnType<typeof setTimeout> | undefined;
    let resettingContentKey: string | null = null;
    let resettingAllContent = false;
    type ModifiedItem = { id: string; title: string };
    // Full modified inventory is fetched lazily when the dialog opens,
    // so course-tab navigations do not pay for comparing
    // every problem against its bundled copy.
    let modifiedProblems: ModifiedItem[] = [];
    let modifiedCourses: ModifiedItem[] = [];
    let modifiedInventoryLoading = false;
    $: modifiedItemCount = modifiedProblems.length + modifiedCourses.length;

    $: if (open) void loadModifiedInventory();
    $: if (!open) {
        pathCopied = false;
        if (pathCopiedTimer) clearTimeout(pathCopiedTimer);
    }
    onDestroy(() => { if (pathCopiedTimer) clearTimeout(pathCopiedTimer); });

    async function loadModifiedInventory() {
        manageProblemsError = '';
        pathCopied = false;
        if (pathCopiedTimer) clearTimeout(pathCopiedTimer);
        modifiedInventoryLoading = true;
        try {
            const response = await fetch('/api/content/modified');
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result?.error || 'Could not load modified content');
            modifiedProblems = Array.isArray(result.modifiedProblems) ? result.modifiedProblems : [];
            modifiedCourses = Array.isArray(result.modifiedCourses) ? result.modifiedCourses : [];
        } catch (err: any) {
            manageProblemsError = err?.message
                ? `Could not load modified content: ${err.message}`
                : 'Could not load modified content';
        } finally {
            modifiedInventoryLoading = false;
        }
    }

    async function copyContentDir() {
        manageProblemsError = '';
        try {
            await navigator.clipboard.writeText(contentDir);
            pathCopied = true;
            if (pathCopiedTimer) clearTimeout(pathCopiedTimer);
            pathCopiedTimer = setTimeout(() => {
                pathCopied = false;
            }, 1500);
        } catch {
            manageProblemsError = `Could not copy. Path: ${contentDir}`;
        }
    }

    async function revealContentFolder() {
        manageProblemsError = '';
        revealingFolder = true;
        try {
            const response = await fetch('/api/reveal-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: contentDir })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.error || 'Could not open the folder');
            }
        } catch (err: any) {
            manageProblemsError = err?.message
                ? `Could not open the folder automatically. Please open it manually: ${contentDir}`
                : `Please open this folder manually: ${contentDir}`;
        } finally {
            revealingFolder = false;
        }
    }

    async function resetContentToBundled(type: 'problem' | 'course', id: string) {
        manageProblemsError = '';
        resettingContentKey = `${type}:${id}`;
        try {
            const response = await fetch('/api/content/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.error || 'Could not reset content');
            }
            window.location.reload();
        } catch (err: any) {
            manageProblemsError = err?.message
                ? `Could not reset ${id}: ${err.message}`
                : `Could not reset ${id}`;
        } finally {
            resettingContentKey = null;
        }
    }

    async function resetAllModifiedToBundled() {
        manageProblemsError = '';
        resettingAllContent = true;
        try {
            const response = await fetch('/api/content/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.error || 'Could not reset content');
            }
            window.location.reload();
        } catch (err: any) {
            manageProblemsError = err?.message
                ? `Could not reset all: ${err.message}`
                : 'Could not reset all';
        } finally {
            resettingAllContent = false;
        }
    }

</script>

    {#if open}
        <div class="home-modal-shell">
            <button class="home-modal-backdrop" aria-label="Close manage problems" tabindex="-1" onclick={() => void onClose()}></button>
            <div bind:this={card} class="home-modal-card manage-problems-card" role="dialog" aria-modal="true" aria-labelledby="manage-problems-title">
                <span class="modal-eyebrow">Local content</span>
                <h2 id="manage-problems-title">Manage Problems</h2>
                <p class="manage-intro">Problems and courses live in your Cojudge folder. Edit files directly — changes apply on refresh.</p>

                <div class="manage-path-row">
                    <code class="manage-path-text">{contentDir}</code>
                    <button
                        class="manage-path-copy"
                        type="button"
                        onclick={copyContentDir}
                        title={pathCopied ? 'Copied' : 'Copy path'}
                        aria-label={pathCopied ? 'Path copied' : 'Copy path'}
                    >
                        {#if pathCopied}
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        {:else}
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        {/if}
                    </button>
                </div>

                <div class="manage-sections">
                    <div class="manage-section">
                        <h3>Problems</h3>
                        <code class="manage-section-path">problems/&lt;slug&gt;/</code>
                        <p>statement.md · metadata.json · official-tests.json · Marker.java · solution.md (optional)</p>
                    </div>
                    <div class="manage-section">
                        <h3>Courses</h3>
                        <code class="manage-section-path">courses/&lt;id&gt;/courseinfo.json</code>
                        <p>Category order and problem list for each course tab.</p>
                    </div>
                </div>

                <p class="manage-note">Duplicate a problem folder, edit it, then register the slug in a <code>courseinfo.json</code>. Unedited copies auto-update when Cojudge ships fixes; your edits are never overwritten.</p>

                {#if modifiedInventoryLoading}
                    <div class="manage-section manage-modified" aria-live="polite">
                        <h3>Modified — differs from bundled</h3>
                        <p>Checking your Cojudge folder for edits…</p>
                    </div>
                {:else if modifiedItemCount > 0}
                    <div class="manage-section manage-modified">
                        <h3>Modified — differs from bundled ({modifiedItemCount})</h3>
                        <p>If you did not edit these, they are stale copies from an older version — reset them to receive the latest fixes. Resetting discards your edits to that item.</p>
                        <ul class="manage-modified-list">
                            {#each modifiedProblems as item}
                                <li>
                                    <span class="manage-modified-id" title={item.title}>{item.id}</span>
                                    <span class="manage-modified-kind">problem</span>
                                    <button
                                        class="btn manage-reset-btn"
                                        type="button"
                                        disabled={resettingContentKey !== null || resettingAllContent}
                                        onclick={() => void resetContentToBundled('problem', item.id)}
                                    >{resettingContentKey === `problem:${item.id}` ? 'Resetting…' : 'Reset'}</button>
                                </li>
                            {/each}
                            {#each modifiedCourses as item}
                                <li>
                                    <span class="manage-modified-id" title={item.title}>{item.id}</span>
                                    <span class="manage-modified-kind">course</span>
                                    <button
                                        class="btn manage-reset-btn"
                                        type="button"
                                        disabled={resettingContentKey !== null || resettingAllContent}
                                        onclick={() => void resetContentToBundled('course', item.id)}
                                    >{resettingContentKey === `course:${item.id}` ? 'Resetting…' : 'Reset'}</button>
                                </li>
                            {/each}
                        </ul>
                        {#if modifiedItemCount > 1}
                            <button
                                class="btn"
                                type="button"
                                disabled={resettingContentKey !== null || resettingAllContent}
                                onclick={() => void resetAllModifiedToBundled()}
                            >{resettingAllContent ? 'Resetting…' : `Reset all (${modifiedItemCount})`}</button>
                        {/if}
                    </div>
                {/if}

                {#if manageProblemsError}
                    <p class="modal-error" role="alert">{manageProblemsError}</p>
                {/if}
                <div class="home-modal-actions">
                    <button class="btn" type="button" onclick={revealContentFolder} disabled={revealingFolder}>{revealingFolder ? 'Opening…' : 'Open folder'}</button>
                    <span class="modal-action-spacer"></span>
                    <button class="btn modal-primary-btn" type="button" onclick={() => void onClose()}>Done</button>
                </div>
            </div>
        </div>
    {/if}

<style>
    .btn {
        appearance: none;
        border: 1px solid var(--color-border);
        padding: 0.35rem 0.75rem;
        border-radius: 0.375rem;
        background: var(--color-btn);
        cursor: pointer;
        font-size: 0.9rem;
        color: inherit;
    }
    .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .home-modal-shell {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: 1.25rem;
        overflow-y: auto;
    }
    .home-modal-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(0, 0, 0, 0.52);
        cursor: default;
    }
    .home-modal-card {
        position: relative;
        width: min(430px, 100%);
        max-height: calc(100vh - 2.5rem);
        max-height: calc(100dvh - 2.5rem);
        overflow-y: auto;
        padding: 1.5rem;
        border: 1px solid var(--color-border);
        border-radius: 0.875rem;
        background: var(--color-bg);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.3);
    }
    .home-modal-card h2 {
        margin: 0 0 0.75rem;
        font-size: 1.25rem;
    }
    .home-modal-card p {
        margin: 0;
        color: var(--color-text-secondary);
        line-height: 1.55;
    }
    .home-modal-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 0.625rem;
        margin-top: 1.5rem;
    }
    .modal-primary-btn {
        border-color: var(--color-highlight);
        background: var(--color-highlight);
        color: #fff;
        font-weight: 650;
    }
    .modal-primary-btn:hover {
        filter: brightness(1.05);
    }
    .modal-eyebrow {
        display: block;
        margin-top: 0.35rem;
        color: var(--color-highlight);
        font-size: 0.7rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
    .manage-problems-card {
        width: min(520px, 100%);
    }
    .manage-problems-card h2 {
        margin: 0.15rem 0 0.5rem;
    }
    .manage-intro {
        margin: 0 0 0.85rem !important;
        font-size: 0.92rem;
        line-height: 1.5;
    }
    .manage-path-row {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0 0 1rem;
        padding: 0.45rem 0.45rem 0.45rem 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: 0.55rem;
        background: var(--color-surface);
    }
    .manage-path-text {
        flex: 1 1 auto;
        min-width: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.8rem;
        line-height: 1.4;
        color: var(--color-text);
        word-break: break-all;
    }
    .manage-path-copy {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 0.4rem;
        background: transparent;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    }
    .manage-path-copy:hover {
        background: var(--color-surface-hover, rgba(0, 0, 0, 0.05));
        color: var(--color-text);
        border-color: var(--color-border);
    }
    .manage-path-copy:focus-visible {
        outline: 2px solid var(--color-highlight);
        outline-offset: 1px;
    }
    .manage-sections {
        display: grid;
        gap: 0.55rem;
        margin: 0 0 0.9rem;
    }
    .manage-section {
        padding: 0.65rem 0.75rem;
        border: 1px solid var(--color-border);
        border-radius: 0.55rem;
        background: var(--color-surface);
    }
    .manage-section h3 {
        margin: 0 0 0.3rem;
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-secondary);
    }
    .manage-section-path {
        display: block;
        margin: 0 0 0.25rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.82rem;
        color: var(--color-text);
        word-break: break-all;
    }
    .manage-section p {
        margin: 0 !important;
        font-size: 0.82rem;
        line-height: 1.45;
        color: var(--color-text-secondary);
    }
    .manage-section .btn {
        margin-top: 0.55rem;
    }
    .manage-modified p {
        margin-bottom: 0.55rem !important;
    }
    .manage-modified-list {
        list-style: none;
        display: grid;
        gap: 0.35rem;
        max-height: 12rem;
        overflow-y: auto;
        margin: 0 0 0.1rem;
        padding: 0;
    }
    .manage-modified-list li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
    }
    .manage-modified-id {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.82rem;
        color: var(--color-text);
    }
    .manage-modified-kind {
        flex: 0 0 auto;
        font-size: 0.72rem;
        color: var(--color-text-secondary);
    }
    .manage-modified-list .manage-reset-btn {
        flex: 0 0 auto;
        margin-top: 0;
        padding: 0.3rem 0.7rem;
        font-size: 0.8rem;
    }
    .manage-note {
        margin: 0 0 0.65rem !important;
        font-size: 0.85rem;
        line-height: 1.5;
    }
    .manage-note code {
        font-size: 0.9em;
        padding: 0.05em 0.3em;
        border-radius: 0.25rem;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
    }
    .manage-problems-card .home-modal-actions {
        margin-top: 1.15rem;
    }
    .modal-error {
        margin-top: 0.75rem !important;
        color: var(--color-hard) !important;
        font-size: 0.8rem;
        font-weight: 600;
    }
    .modal-action-spacer {
        flex: 1;
    }
    @media (max-width: 640px) {
        .home-modal-shell { align-items: end; padding: 0.75rem; }
        .home-modal-card {
            max-height: calc(100vh - 1.5rem);
            max-height: calc(100dvh - 1.5rem);
            padding: 1.25rem;
            border-radius: 1rem;
        }
        .modal-action-spacer { display: none; }
    }
</style>

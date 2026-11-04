<script lang="ts">
    import { tick } from 'svelte';
    import {
        clearFirebaseSettings, emptyFirebaseSettings, getFirebaseSettings,
        hasSavedFirebaseSettings, isFirebaseConfigured, saveFirebaseSettings, type FirebaseSettings
    } from '$lib/firebaseSettings';
    import { restartCloudSync } from '$lib/cloudSync';

    export let open = false;
    export let card: HTMLElement | null = null;
    export let configured = false;
    export let saved = false;
    export let onClose: () => void | Promise<void>;
    export let onNotice: (message: string, error: boolean) => void;

    let firebaseApiKeyInput: HTMLInputElement | null = null;
    let firebaseForm: FirebaseSettings = emptyFirebaseSettings();
    let firebaseSettingsError = '';
    $: if (open) void prepareForm();

    async function prepareForm() {
        firebaseForm = getFirebaseSettings();
        saved = hasSavedFirebaseSettings();
        firebaseSettingsError = '';
        await tick();
        firebaseApiKeyInput?.focus();
    }

    function submitFirebaseSettings(event: SubmitEvent) {
        event.preventDefault();
        const settings: FirebaseSettings = {
            apiKey: firebaseForm.apiKey.trim(),
            authDomain: firebaseForm.authDomain.trim(),
            projectId: firebaseForm.projectId.trim(),
            storageBucket: firebaseForm.storageBucket.trim(),
            messagingSenderId: firebaseForm.messagingSenderId.trim(),
            appId: firebaseForm.appId.trim(),
            googleDesktopClientId: firebaseForm.googleDesktopClientId.trim(),
            googleDesktopClientSecret: firebaseForm.googleDesktopClientSecret.trim()
        };
        if (!isFirebaseConfigured(settings)) {
            firebaseSettingsError = 'Complete all required Firebase fields.';
            return;
        }

        try {
            saveFirebaseSettings(settings);
            configured = true;
            saved = true;
            onNotice('Firebase settings saved.', false);
            void restartCloudSync();
            void onClose();
        } catch (err: any) {
            firebaseSettingsError = err?.message || String(err);
        }
    }

    function removeFirebaseSettings() {
        try {
            clearFirebaseSettings();
            firebaseForm = getFirebaseSettings();
            configured = isFirebaseConfigured();
            saved = false;
            firebaseSettingsError = '';
            onNotice('Saved Firebase settings removed.', false);
            void restartCloudSync();
        } catch (err: any) {
            firebaseSettingsError = err?.message || String(err);
        }
    }

</script>

    {#if open}
        <div class="home-modal-shell">
            <button class="home-modal-backdrop" aria-label="Close Firebase settings" tabindex="-1" onclick={onClose}></button>
            <div
                bind:this={card}
                class="home-modal-card firebase-settings-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="firebase-settings-title"
            >
                <form onsubmit={submitFirebaseSettings}>
                <div class="modal-heading-row">
                    <div>
                        <span class="modal-eyebrow">Desktop connection</span>
                        <h2 id="firebase-settings-title">Firebase settings</h2>
                    </div>
                    <span class:configured={configured} class="firebase-status-pill">
                        <span></span>{configured ? 'Configured' : 'Not configured'}
                    </span>
                </div>
                <p>Connect this desktop app to the Firebase project used for shared solutions and Cojudge Cloud.</p>
                <div class="firebase-fields">
                    <label>
                        <span>API key <code>VITE_FIREBASE_API_KEY</code></span>
                        <input bind:this={firebaseApiKeyInput} bind:value={firebaseForm.apiKey} required autocomplete="off" spellcheck="false" />
                    </label>
                    <label>
                        <span>Auth domain <code>VITE_FIREBASE_AUTH_DOMAIN</code></span>
                        <input bind:value={firebaseForm.authDomain} required autocomplete="off" spellcheck="false" placeholder="project.firebaseapp.com" />
                    </label>
                    <label>
                        <span>Project ID <code>VITE_FIREBASE_PROJECT_ID</code></span>
                        <input bind:value={firebaseForm.projectId} required autocomplete="off" spellcheck="false" />
                    </label>
                    <label>
                        <span>Messaging sender ID <code>VITE_FIREBASE_MESSAGING_SENDER_ID</code></span>
                        <input bind:value={firebaseForm.messagingSenderId} required autocomplete="off" spellcheck="false" inputmode="numeric" />
                    </label>
                    <label class="firebase-field-wide">
                        <span>App ID <code>VITE_FIREBASE_APP_ID</code></span>
                        <input bind:value={firebaseForm.appId} required autocomplete="off" spellcheck="false" />
                    </label>
                    <label class="firebase-field-wide">
                        <span>Storage bucket <small>optional</small> <code>VITE_FIREBASE_STORAGE_BUCKET</code></span>
                        <input bind:value={firebaseForm.storageBucket} autocomplete="off" spellcheck="false" placeholder="project.firebasestorage.app" />
                    </label>
                    <label class="firebase-field-wide">
                        <span>Google desktop client ID <small>required for Cloud sign-in</small> <code>VITE_GOOGLE_DESKTOP_CLIENT_ID</code></span>
                        <input bind:value={firebaseForm.googleDesktopClientId} autocomplete="off" spellcheck="false" placeholder="000000000000-example.apps.googleusercontent.com" />
                    </label>
                    <label class="firebase-field-wide">
                        <span>Google desktop client secret <small>required for local/custom builds</small> <code>VITE_GOOGLE_DESKTOP_CLIENT_SECRET</code></span>
                        <input type="password" bind:value={firebaseForm.googleDesktopClientSecret} autocomplete="off" spellcheck="false" placeholder="GOCSPX-…" />
                    </label>
                </div>
                <p class="firebase-settings-note">Stored only on this device. Desktop OAuth credentials cannot be confidential in an installed app; PKCE protects each sign-in exchange.</p>
                {#if firebaseSettingsError}
                    <p class="modal-error" role="alert">{firebaseSettingsError}</p>
                {/if}
                    <div class="home-modal-actions settings-actions">
                        {#if saved}
                            <button class="btn remove-settings-btn" type="button" onclick={removeFirebaseSettings}>Remove saved</button>
                        {/if}
                        <span class="modal-action-spacer"></span>
                        <button class="btn" type="button" onclick={onClose}>Cancel</button>
                        <button class="btn modal-primary-btn" type="submit">Save settings</button>
                    </div>
                </form>
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
    .modal-heading-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.5rem;
    }
    .modal-heading-row h2 {
        margin-bottom: 0;
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
    .firebase-settings-card {
        width: min(720px, 100%);
    }
    .firebase-status-pill {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        gap: 0.4rem;
        padding: 0.3rem 0.55rem;
        border: 1px solid var(--color-border);
        border-radius: 999px;
        color: var(--color-text-secondary);
        font-size: 0.72rem;
        font-weight: 650;
    }
    .firebase-status-pill span {
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 50%;
        background: var(--color-text-secondary);
    }
    .firebase-status-pill.configured {
        color: var(--color-easy);
    }
    .firebase-status-pill.configured span {
        background: var(--color-easy);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-easy) 16%, transparent);
    }
    .firebase-fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.9rem 1rem;
        margin-top: 1.25rem;
    }
    .firebase-fields label {
        display: grid;
        gap: 0.4rem;
        min-width: 0;
        color: var(--color-text);
        font-size: 0.82rem;
        font-weight: 650;
    }
    .firebase-fields label > span {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
    }
    .firebase-fields code {
        overflow: hidden;
        color: var(--color-text-secondary);
        font-size: 0.62rem;
        font-weight: 500;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .firebase-fields small {
        color: var(--color-text-secondary);
        font-size: 0.7rem;
        font-weight: 500;
    }
    .firebase-fields input {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        padding: 0.65rem 0.7rem;
        border: 1px solid var(--color-border);
        border-radius: 0.5rem;
        outline: none;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-mono);
        font-size: 0.8rem;
    }
    .firebase-fields input:focus {
        border-color: var(--color-highlight);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-highlight) 18%, transparent);
    }
    .firebase-field-wide {
        grid-column: 1 / -1;
    }
    .home-modal-card .firebase-settings-note {
        margin-top: 1rem;
        padding: 0.75rem;
        border-radius: 0.5rem;
        background: var(--color-second-bg);
        font-size: 0.76rem;
    }
    .modal-error {
        margin-top: 0.75rem !important;
        color: var(--color-hard) !important;
        font-size: 0.8rem;
        font-weight: 600;
    }
    .settings-actions {
        border-top: 1px solid var(--color-border);
        padding-top: 1rem;
    }
    .modal-action-spacer {
        flex: 1;
    }
    .remove-settings-btn {
        color: var(--color-hard);
    }
    @media (max-width: 640px) {
        .home-modal-shell { align-items: end; padding: 0.75rem; }
        .home-modal-card {
            max-height: calc(100vh - 1.5rem);
            max-height: calc(100dvh - 1.5rem);
            padding: 1.25rem;
            border-radius: 1rem;
        }
        .firebase-fields { grid-template-columns: 1fr; }
        .firebase-field-wide { grid-column: auto; }
        .firebase-fields label > span { display: grid; gap: 0.15rem; }
        .modal-heading-row { display: grid; }
        .firebase-status-pill { width: fit-content; }
        .settings-actions .remove-settings-btn { width: 100%; }
        .modal-action-spacer { display: none; }
    }
</style>

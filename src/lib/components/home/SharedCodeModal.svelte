<script lang="ts">
    import { tick } from 'svelte';
    import { goto } from '$app/navigation';
    import { completeSharedCode, inputCodeCharacter, pastedCodeCharacters } from '$lib/home/sharedCode';

    export let open = false;
    export let card: HTMLElement | null = null;
    export let onClose: () => void | Promise<void>;

    let loadCodeCharacters = ['', '', '', ''];
    let loadCodeNavigating = false;
    let loadCodeInputs: HTMLInputElement[] = [];
    $: if (open) void prepareInputs();

    async function prepareInputs() {
        loadCodeCharacters = ['', '', '', ''];
        loadCodeNavigating = false;
        await tick();
        loadCodeInputs[0]?.focus();
    }

    function updateLoadCode(index: number, event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const character = inputCodeCharacter(input.value);
        loadCodeCharacters[index] = character;
        loadCodeCharacters = [...loadCodeCharacters];
        input.value = character;
        if (character && index < loadCodeInputs.length - 1) {
            loadCodeInputs[index + 1]?.focus();
        }
        navigateToSharedCodeIfComplete();
    }

    function handleLoadCodeKeydown(index: number, event: KeyboardEvent) {
        if (event.key === 'Backspace' && !loadCodeCharacters[index] && index > 0) {
            loadCodeCharacters[index - 1] = '';
            loadCodeCharacters = [...loadCodeCharacters];
            loadCodeInputs[index - 1]?.focus();
        } else if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            loadCodeInputs[index - 1]?.focus();
        } else if (event.key === 'ArrowRight' && index < loadCodeInputs.length - 1) {
            event.preventDefault();
            loadCodeInputs[index + 1]?.focus();
        }
    }

    async function handleLoadCodePaste(event: ClipboardEvent) {
        const characters = pastedCodeCharacters(event.clipboardData?.getData('text') ?? '');
        if (!characters) return;
        event.preventDefault();
        loadCodeCharacters = Array.from({ length: 4 }, (_, index) => characters[index] ?? '');
        if (characters.length === 4) {
            navigateToSharedCodeIfComplete();
            return;
        }
        await tick();
        loadCodeInputs[Math.min(characters.length, 4) - 1]?.focus();
    }

    function navigateToSharedCodeIfComplete() {
        const code = completeSharedCode(loadCodeCharacters);
        if (loadCodeNavigating || !code) return;
        loadCodeNavigating = true;
        open = false;
        void goto(`/p/${encodeURIComponent(code)}`);
    }

</script>

    {#if open}
        <div class="home-modal-shell">
            <button class="home-modal-backdrop" aria-label="Close shared code loader" tabindex="-1" onclick={onClose}></button>
            <div bind:this={card} class="home-modal-card load-code-card" role="dialog" aria-modal="true" aria-labelledby="load-code-title">
                <span class="modal-eyebrow">Shared solution</span>
                <h2 id="load-code-title">Enter code</h2>
                <p>Type or paste the four-character code from a Cojudge share link.</p>
                <div class="load-code-inputs" aria-label="Four-character share code" onpaste={handleLoadCodePaste}>
                    {#each loadCodeCharacters as character, index}
                        <input
                            bind:this={loadCodeInputs[index]}
                            value={character}
                            aria-label={`Code character ${index + 1}`}
                            maxlength="1"
                            autocomplete="off"
                            autocapitalize="none"
                            spellcheck="false"
                            inputmode="text"
                            oninput={(event) => updateLoadCode(index, event)}
                            onkeydown={(event) => handleLoadCodeKeydown(index, event)}
                        />
                    {/each}
                </div>
                <p class="load-code-hint">Codes are case-sensitive and open automatically.</p>
                <div class="home-modal-actions load-code-actions">
                    <button class="btn" type="button" onclick={onClose}>Cancel</button>
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
    .modal-eyebrow {
        display: block;
        margin-top: 0.35rem;
        color: var(--color-highlight);
        font-size: 0.7rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
    .load-code-card {
        width: min(560px, 100%);
        padding: 2.25rem;
        text-align: center;
    }
    .load-code-card h2 {
        margin-bottom: 0.5rem;
        font-size: clamp(1.7rem, 5vw, 2.25rem);
    }
    .load-code-inputs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: clamp(0.55rem, 2vw, 1rem);
        width: min(410px, 100%);
        margin: 2rem auto 0;
    }
    .load-code-inputs input {
        width: 100%;
        aspect-ratio: 0.9;
        min-width: 0;
        box-sizing: border-box;
        border: 2px solid var(--color-border);
        border-radius: 0.75rem;
        outline: none;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: var(--font-mono);
        font-size: clamp(1.55rem, 7vw, 2.25rem);
        font-weight: 750;
        text-align: center;
        caret-color: var(--color-highlight);
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }
    .load-code-inputs input:focus {
        border-color: var(--color-highlight);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-highlight) 18%, transparent);
        transform: translateY(-2px);
    }
    .home-modal-card .load-code-hint {
        margin-top: 0.75rem;
        font-size: 0.76rem;
    }
    .load-code-actions {
        justify-content: center;
        margin-top: 1.75rem;
    }
    @media (max-width: 640px) {
        .home-modal-shell { align-items: end; padding: 0.75rem; }
        .home-modal-card {
            max-height: calc(100vh - 1.5rem);
            max-height: calc(100dvh - 1.5rem);
            padding: 1.25rem;
            border-radius: 1rem;
        }
        .load-code-card { padding: 1.75rem 1.25rem; }
        .load-code-inputs { margin-top: 1.5rem; }
    }
</style>

<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { goto } from '$app/navigation';
    import type { CourseSummary } from '$lib/home/catalog';
    import { COURSE_STORAGE_KEY, COURSE_VISIBILITY_KEY, filterCourses, isCourseVisible, readCourseVisibility, restoredCourseId } from '$lib/home/courseVisibility';

    export let courses: CourseSummary[] = [];
    export let selectedCourseId: string | null = null;
    export let pendingCourseId: string | null = null;
    export let isCourseNavigating = false;
    export let showBookmarks = false;
    export let open = false;
    export let onSelect: (courseId: string) => void;

    let courseVisibility: Record<string, boolean> = {};
    let listsReady = false;
    let manageLists = false;
    let listSearch = '';
    let listsMenuRef: HTMLElement | null = null;
    let listsToggleButton: HTMLButtonElement | null = null;
    let listSearchInput: HTMLInputElement | null = null;
    $: visibleCourses = courses.filter((course) => isCourseVisible(course, courseVisibility));
    $: filteredListCourses = filterCourses(courses, courseVisibility, listSearch, manageLists);
    $: pickerCourse = courses.find((course) => course.id === (pendingCourseId ?? selectedCourseId));

    export function ensureCourseVisible(courseId: string) {
        const course = courses.find((item) => item.id === courseId);
        if (course && !isCourseVisible(course, courseVisibility)) setCourseVisible(courseId, true);
    }

    function handleClickOutside(event: MouseEvent) {
        if (open && listsMenuRef && !event.composedPath().includes(listsMenuRef)) open = false;
    }

    onMount(() => {
        listsReady = true;
        window.addEventListener('click', handleClickOutside);
        courseVisibility = readCourseVisibility(localStorage);
        const url = new URL(window.location.href);
        const hasCourseParameter = url.searchParams.has('course');
        const target = restoredCourseId(hasCourseParameter, hasCourseParameter ? null : localStorage.getItem(COURSE_STORAGE_KEY), selectedCourseId, visibleCourses);
        if (target) void goto(`/?course=${encodeURIComponent(target)}`, { replaceState: true });
        return () => window.removeEventListener('click', handleClickOutside);
    });

    async function toggleListsMenu() {
        open = !open;
        manageLists = false;
        listSearch = '';
        if (open) {
            await tick();
            listSearchInput?.focus();
        }
    }

    function closeListsMenu(returnFocus = false) {
        open = false;
        if (returnFocus) listsToggleButton?.focus();
    }

    function handleListsKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeListsMenu(true);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            const items = Array.from(listsMenuRef?.querySelectorAll<HTMLElement>('.list-link') ?? []);
            if (!items.length) return;
            event.preventDefault();
            const index = items.indexOf(document.activeElement as HTMLElement);
            const next = event.key === 'ArrowDown'
                ? (index + 1) % items.length
                : (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length);
            items[next]?.focus();
        }
    }

    function setCourseVisible(courseId: string, visible: boolean) {
        courseVisibility = { ...courseVisibility, [courseId]: visible };
        try {
            localStorage.setItem(COURSE_VISIBILITY_KEY, JSON.stringify(courseVisibility));
        } catch {
            // Storage can be unavailable (private mode); the choice then lasts for this page only.
        }
        // Hiding the open course moves to the first list that is still shown.
        if (!visible && courseId === selectedCourseId && !showBookmarks) {
            const next = courses.find((course) => isCourseVisible(course, courseVisibility));
            if (next) {
                onSelect(next.id);
                goto(`/?course=${encodeURIComponent(next.id)}`);
            }
        }
    }

    function resetCourseVisibility() {
        courseVisibility = {};
        try {
            localStorage.removeItem(COURSE_VISIBILITY_KEY);
        } catch {
            // ignore
        }
    }

</script>

        <div class="lists-menu" bind:this={listsMenuRef}>
            <button
                bind:this={listsToggleButton}
                type="button"
                class="lists-toggle"
                class:pending={isCourseNavigating}
                disabled={!listsReady}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="course-picker-panel"
                aria-label={`Choose a list. Current list: ${pickerCourse?.title ?? 'None'}`}
                aria-busy={isCourseNavigating || undefined}
                onclick={toggleListsMenu}
            >
                <svg class="list-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="3" width="16" height="18" rx="3" />
                    <path d="M9 8h6M9 12h6M9 16h3" />
                </svg>
                <span class="selected-course-title">{pickerCourse?.title ?? 'Choose a list'}</span>
                {#if isCourseNavigating}<span class="tab-spinner" aria-hidden="true"></span>{/if}
                <span class="lists-count">{visibleCourses.length} {visibleCourses.length === 1 ? 'list' : 'lists'}</span>
                <svg class="lists-chevron" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m6 8 4 4 4-4" />
                </svg>
            </button>
            {#if open}
                <div id="course-picker-panel" class="lists-panel" role="dialog" aria-label={manageLists ? 'Manage lists' : 'Choose a list'} tabindex="-1" onkeydown={handleListsKeydown}>
                    {#if manageLists}
                        <button class="lists-back" type="button" onclick={() => { manageLists = false; listSearch = ''; listSearchInput?.focus(); }}>
                            <span aria-hidden="true">←</span> Back to lists
                        </button>
                    {/if}
                    <div class="lists-search">
                        <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
                            <circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" />
                        </svg>
                        <input bind:this={listSearchInput} bind:value={listSearch} type="search" placeholder="Find a list…" aria-label="Find a list" autocomplete="off" />
                    </div>
                    <div class="lists-results">
                        {#if manageLists}
                            <p class="lists-help">Choose the lists you want in your menu.</p>
                            <div role="group" aria-label="Lists shown in the main menu">
                                {#each filteredListCourses as course}
                                    {@const checked = isCourseVisible(course, courseVisibility)}
                                    <label class="lists-option">
                                        <input type="checkbox" {checked} disabled={checked && visibleCourses.length === 1} onchange={(event) => setCourseVisible(course.id, event.currentTarget.checked)} />
                                        <span>{course.title}</span>
                                    </label>
                                {/each}
                            </div>
                        {:else}
                            <nav aria-label="Course">
                                {#each filteredListCourses as course}
                                    <a
                                        class="list-link"
                                        class:active={!showBookmarks && course.id === selectedCourseId}
                                        href={`/?course=${encodeURIComponent(course.id)}`}
                                        aria-current={!showBookmarks && course.id === selectedCourseId ? 'page' : undefined}
                                        onclick={(event) => {
                                            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                                            event.preventDefault();
                                            onSelect(course.id);
                                            closeListsMenu();
                                            void goto(`/?course=${encodeURIComponent(course.id)}`);
                                        }}
                                    >
                                        <span>{course.title}</span>
                                        {#if !showBookmarks && course.id === selectedCourseId}
                                            <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4 4 8-8" /></svg>
                                        {/if}
                                    </a>
                                {/each}
                            </nav>
                        {/if}
                        {#if filteredListCourses.length === 0}<p class="lists-empty">No lists match “{listSearch}”.</p>{/if}
                    </div>
                    <div class="lists-footer">
                        {#if manageLists}
                            <button type="button" onclick={resetCourseVisibility}>Reset to default</button>
                        {:else}
                            <button type="button" onclick={() => { manageLists = true; listSearch = ''; listSearchInput?.focus(); }}>
                                <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 6h14M3 14h14" /><circle cx="7" cy="6" r="2" fill="var(--color-bg)" /><circle cx="13" cy="14" r="2" fill="var(--color-bg)" /></svg>
                                Manage lists
                            </button>
                            <span>{visibleCourses.length} {visibleCourses.length === 1 ? 'list' : 'lists'}</span>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>

<style>
    .lists-menu { position: relative; flex: 0 1 620px; min-width: 0; }
    .lists-toggle {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        min-height: 54px;
        padding: 0.85rem 1rem;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        background: var(--color-surface);
        color: var(--color-text);
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: border-color 0.15s ease, background-color 0.15s ease;
    }
    .lists-toggle:hover, .lists-toggle[aria-expanded="true"] { border-color: var(--color-text-secondary); }
    .lists-toggle:focus-visible, .list-link:focus-visible, .lists-footer button:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 3px;
    }
    .list-icon { flex: 0 0 auto; color: var(--color-text-secondary); }
    .selected-course-title { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 1rem; font-weight: 600; line-height: 1.45; }
    .lists-count { margin-left: 0.5rem; color: var(--color-text-secondary); font-size: 0.75rem; white-space: nowrap; }
    .lists-chevron { flex: 0 0 auto; color: var(--color-text-secondary); transition: transform 0.15s ease; }
    .lists-toggle[aria-expanded="true"] .lists-chevron { transform: rotate(180deg); }
    .lists-panel {
        position: absolute;
        left: 0;
        top: calc(100% + 8px);
        z-index: 50;
        width: 100%;
        min-width: min(360px, calc(100vw - 48px));
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: 12px;
        background: var(--color-bg);
        box-shadow: 0 12px 32px #0002;
    }
    .lists-search { display: flex; align-items: center; gap: 0.65rem; padding: 0.9rem 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); }
    .lists-search svg { flex: 0 0 auto; }
    .lists-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--color-text); font: inherit; font-size: 0.9rem; }
    .lists-results { max-height: min(420px, 50dvh); overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; padding: 0.35rem; }
    .lists-results nav { display: block; }
    .list-link, .lists-option { display: flex; align-items: center; gap: 0.75rem; min-height: 42px; padding: 0.65rem 0.7rem; border-radius: 7px; color: var(--color-text-secondary); font-size: 0.9rem; line-height: 1.4; cursor: pointer; text-decoration: none; }
    .list-link span, .lists-option span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .list-link svg { flex: 0 0 auto; color: var(--color-primary); }
    .list-link:hover, .lists-option:hover { background: var(--color-surface-hover); color: var(--color-text); }
    .list-link.active { background: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-text); font-weight: 600; }
    .lists-option input { width: 16px; height: 16px; flex: 0 0 auto; accent-color: var(--color-primary); }
    .lists-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.65rem 1rem; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 0.75rem; }
    .lists-footer button, .lists-back { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; border: 0; background: transparent; color: var(--color-text-secondary); font: inherit; cursor: pointer; }
    .lists-footer button:hover, .lists-back:hover { color: var(--color-text); }
    .lists-back { margin: 0.6rem 1rem 0; font-size: 0.8rem; }
    .lists-help, .lists-empty { margin: 0; padding: 0.75rem; color: var(--color-text-secondary); font-size: 0.8rem; }
    /* Loading indicator for course changes. */
    .tab-spinner {
        width: 0.8rem;
        height: 0.8rem;
        flex: 0 0 auto;
        border-radius: 50%;
        border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
        border-top-color: currentColor;
        animation: tab-spin 0.7s linear infinite;
    }
    @keyframes tab-spin {
        to {
            transform: rotate(360deg);
        }
    }
    @media (max-width: 640px) {
        .lists-menu { flex-basis: 100%; }
        .lists-toggle { padding: 0.75rem; gap: 0.6rem; }
        .lists-count { display: none; }
        .lists-panel { min-width: 0; }
    }
</style>

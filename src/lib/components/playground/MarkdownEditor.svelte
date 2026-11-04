<script lang="ts">
    import { v4 as uuidv4 } from 'uuid';
    import { onDestroy, tick } from 'svelte';
    import { browser } from '$app/environment';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import LanguageIcon from '$lib/components/LanguageIcon.svelte';
    import WhiteboardIcon from '$lib/components/WhiteboardIcon.svelte';
    import { showConfirm } from '$lib/dialogs';
    import { createCodeSelection } from '$lib/playground/codeSelection';
    import { createTaskListEditor, isZwspOnlyText } from '$lib/playground/taskLists';
    import { createMarkdownFindPattern, historyMergeGroup, historyStateChars } from '$lib/playground/markdownPolicies';
    import { isFolderEntry, type TabMeta } from '$lib/playground/workspace';
    import type { FileEntry } from '$lib/stores/fileStore';
    import type { ProgrammingLanguage } from '$lib/utils/util';
    import { renderMarkdown, renderMarkdownPlain, htmlToMarkdown, removeFencedCodeBlock, wrapImageThumbnails, wrapCodeBlocksWithCopy, getCodeBlockLanguage, setCodeBlockLanguage, normalizeCodeLanguage, ensureTrailingEmptyLine, ensureFileMentionCarets, prepareTaskListCheckboxes, isTaskListItem, inlineCodeSpanHtml, INLINE_CODE_STYLE_MARKER, THUMB_WRAPPER_CLASS, THUMB_DELETE_CLASS, CODE_COPY_WRAPPER_CLASS, CODE_LANGUAGE_INPUT_CLASS, CODE_LANGUAGE_DATALIST_ID, CODE_LANGUAGE_OPTIONS, resolvePastedImages, isUrlLike, normalizeUrl, linkHtml, parsePlaygroundFileId, playgroundFileHref, fileMentionHtml, FILE_MENTION_CLASS } from '$lib/utils/markdown';
    import { storePastedImage, deletePastedImage, parsePastedImageLink } from '$lib/utils/imageStore';

    export let visible = true;
    export let activeTab: TabMeta | undefined;
    export let tabs: TabMeta[] = [];
    export let sourceContent = '';
    export let lastMarkdownMode: 'wysiwyg' | 'preview' | 'source' = 'wysiwyg';
    export let previewEditMode = false;
    export let fontSize = 14;
    export let isMac = false;
    export let isDesktopMode = false;
    export let language: ProgrammingLanguage = 'markdown';
    export let tabLanguages: Record<string, ProgrammingLanguage> = {};
    export let getFiles: () => FileEntry[];
    export let getLanguageForTab: (fileId: string) => ProgrammingLanguage;
    export let getFilePath: (fileId: string) => string;
    export let getPreviewSourceContent: (fileId: string) => string;
    export let activateTab: (fileId: string) => void | Promise<void>;
    export let onSave: (fileId: string, markdown: string) => void;
    export let onInput: (fileId: string, markdown: string) => void;

    // --- Image lightbox (full-size view opened from thumbnails) ---
    let lightboxSrc: string | null = null;
    function openLightbox(src: string) {
        lightboxSrc = src;
    }
    function closeLightbox() {
        lightboxSrc = null;
    }

    // --- Markdown preview WYSIWYG editing ---

    let wysiwygEl: HTMLDivElement | null = null;
    let wysiwygDebounce: ReturnType<typeof setTimeout> | null = null;
    let wysiwygSourceFileId: string | null = null;
    // Markdown-to-HTML rendering is lossy, so only serialize after a real edit.
    let wysiwygDirty = false;
    let lastActiveTabFileId: string | null = null;
    // Native contenteditable history omits scripted DOM changes and can lose a
    // paste when highlighting replaces code nodes, so keep bounded edit history.
    type WysiwygSelectionPoint = { path: number[]; offset: number };
    type WysiwygSelection = {
        start: WysiwygSelectionPoint;
        end: WysiwygSelectionPoint;
        backward: boolean;
    };
    type WysiwygHistoryState = {
        html: string;
        sourceContent: string | null;
        selection: WysiwygSelection | null;
        activeElementPath: number[] | null;
        sourceFileId: string;
    };
    type WysiwygHistoryEntry = {
        before: WysiwygHistoryState;
        after: WysiwygHistoryState;
        kind: string;
        timestamp: number;
    };
    const WYSIWYG_HISTORY_LIMIT = 100;
    const WYSIWYG_HISTORY_MAX_CHARS = 5 * 1024 * 1024;
    const WYSIWYG_PENDING_IMAGE_ATTR = 'data-wysiwyg-pending-image';
    let wysiwygUndoStack: WysiwygHistoryEntry[] = [];
    let wysiwygRedoStack: WysiwygHistoryEntry[] = [];
    let pendingWysiwygHistory: WysiwygHistoryState | null = null;
    let pendingWysiwygHistoryKind: string | null = null;
    let pendingWysiwygHistoryTimeout: ReturnType<typeof setTimeout> | null = null;
    let applyingWysiwygHistory = false;
    let manualWysiwygHistoryDepth = 0;
    const wysiwygTrackedImageLinks = new Set<string>();
    let showLinkInput = false;
    let linkUrl = '';
    let linkInputEl: HTMLInputElement | null = null;
    let savedLinkRange: Range | null = null;
    let savedLinkHistoryBefore: WysiwygHistoryState | null = null;

    // --- WYSIWYG find in current document (Cmd/Ctrl+F) ---
    let wysiwygFindOpen = false;
    let wysiwygFindQuery = '';
    let wysiwygFindCaseSensitive = false;
    let wysiwygFindRegex = false;
    let wysiwygFindWholeWord = false;
    let wysiwygFindMatches: HTMLElement[] = [];
    let wysiwygFindActiveIndex = -1;
    let wysiwygFindInputEl: HTMLInputElement | null = null;
    let applyingWysiwygFind = false;
    const WYSIWYG_FIND_MARK_CLASS = 'wysiwyg-find-match';
    const WYSIWYG_FIND_ACTIVE_CLASS = 'wysiwyg-find-active';

    // @-mention file picker in the WYSIWYG editor
    let showMentionPopup = false;
    let mentionQuery = '';
    let mentionSelectedIndex = 0;
    let savedMentionRange: Range | null = null;
    let mentionPopupStyle = '';
    let mentionResultsEl: HTMLDivElement | null = null;

    $: mentionFilteredFiles = (() => {
        const currentFileId =
            wysiwygSourceFileId ??
            (activeTab?.type === 'preview' ? activeTab.sourceFileId : activeTab?.fileId) ??
            null;
        const files = tabs.filter((t) => t.type !== 'preview' && t.fileId !== currentFileId);
        return mentionQuery
            ? files.filter((t) => t.fileName.toLowerCase().includes(mentionQuery.toLowerCase()))
            : files.slice().sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
    })();

    $: if (mentionQuery !== undefined) mentionSelectedIndex = 0;

    function renderWysiwygFromStore() {
        if (!wysiwygEl || !wysiwygSourceFileId) return;
        wysiwygEl.innerHTML = renderMarkdownPlain(getPreviewSourceContent(wysiwygSourceFileId), {
            resolveFileLanguage: (fileId) => getLanguageForTab(fileId)
        });
        wrapImageThumbnails(wysiwygEl);
        wrapCodeBlocksWithCopy(wysiwygEl);
        ensureFileMentionCarets(wysiwygEl);
        prepareTaskListCheckboxes(wysiwygEl);
        ensureTrailingEmptyLine(wysiwygEl);
        resolvePastedImages(wysiwygEl);
        wysiwygDirty = false;
        resetWysiwygHistory();
        if (wysiwygFindOpen) {
            // Re-apply find highlights after a full re-render (e.g. file switch)
            tick().then(() => updateWysiwygFindHighlights());
        }
    }

    function clearWysiwygFindHighlights() {
        try {
            (CSS as any).highlights?.delete?.('wysiwyg-find');
            (CSS as any).highlights?.delete?.('wysiwyg-find-active');
        } catch {}
        if (!wysiwygEl) {
            wysiwygFindMatches = [];
            wysiwygFindActiveIndex = -1;
            return;
        }
        applyingWysiwygFind = true;
        try {
            const marks = Array.from(wysiwygEl.querySelectorAll(`.${WYSIWYG_FIND_MARK_CLASS}, mark[data-find-mark]`));
            for (const mark of marks) {
                const parent = mark.parentNode;
                if (!parent) continue;
                while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
                parent.removeChild(mark);
            }
            if (marks.length) wysiwygEl.normalize();
        } finally {
            applyingWysiwygFind = false;
        }
        wysiwygFindMatches = [];
        wysiwygFindActiveIndex = -1;
    }

    function getWysiwygFindRegExp(): RegExp | null {
        return createMarkdownFindPattern(wysiwygFindQuery, wysiwygFindCaseSensitive, wysiwygFindRegex, wysiwygFindWholeWord);
    }

    function updateWysiwygFindHighlights(keepActive = false) {
        if (!wysiwygEl || !wysiwygFindOpen) return;
        const prevActive = keepActive ? wysiwygFindActiveIndex : 0;
        clearWysiwygFindHighlights();
        const query = wysiwygFindQuery;
        if (!query) return;
        const pattern = getWysiwygFindRegExp();
        if (!pattern) return;

        const walker = document.createTreeWalker(wysiwygEl, NodeFilter.SHOW_TEXT, {
            acceptNode: (node: Node) => {
                const parent = (node as Text).parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.closest(`.${CODE_COPY_WRAPPER_CLASS} .code-block-actions`)) return NodeFilter.FILTER_REJECT;
                if (parent.closest(`.${WYSIWYG_FIND_MARK_CLASS}`)) return NodeFilter.FILTER_REJECT;
                if (parent.tagName === 'BUTTON' || parent.closest(`.${THUMB_WRAPPER_CLASS}`)) return NodeFilter.FILTER_REJECT;
                const text = node.textContent || '';
                if (!text) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes: Text[] = [];
        let n: Node | null;
        while ((n = walker.nextNode())) textNodes.push(n as Text);

        type Match = { node: Text; start: number; length: number };
        const allMatches: Match[] = [];
        for (const textNode of textNodes) {
            const text = textNode.textContent || '';
            const re = new RegExp(pattern.source, pattern.flags);
            let m: RegExpExecArray | null;
            while ((m = re.exec(text))) {
                if (m[0].length === 0) {
                    re.lastIndex++;
                    continue;
                }
                allMatches.push({ node: textNode, start: m.index, length: m[0].length });
                if (m.index === re.lastIndex) re.lastIndex++;
            }
        }

        applyingWysiwygFind = true;
        const marks: HTMLElement[] = [];
        try {
            const byNode = new Map<Text, Match[]>();
            for (const match of allMatches) {
                const list = byNode.get(match.node) ?? [];
                list.push(match);
                byNode.set(match.node, list);
            }
            for (const [node, matches] of byNode) {
                matches.sort((a, b) => b.start - a.start);
                for (const match of matches) {
                    const range = document.createRange();
                    try {
                        range.setStart(node, match.start);
                        range.setEnd(node, match.start + match.length);
                        const mark = document.createElement('mark');
                        mark.className = WYSIWYG_FIND_MARK_CLASS;
                        mark.dataset.findMark = '1';
                        range.surroundContents(mark);
                        marks.push(mark);
                    } catch {}
                }
            }
        } finally {
            applyingWysiwygFind = false;
        }

        marks.sort((a, b) => {
            const pos = a.compareDocumentPosition(b);
            return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        wysiwygFindMatches = marks;
        if (marks.length) {
            setWysiwygFindActive(Math.min(Math.max(prevActive, 0), marks.length - 1));
        }
    }

    function setWysiwygFindActive(index: number) {
        if (!wysiwygEl || wysiwygFindMatches.length === 0) {
            wysiwygFindActiveIndex = -1;
            return;
        }
        const clamped = ((index % wysiwygFindMatches.length) + wysiwygFindMatches.length) % wysiwygFindMatches.length;
        wysiwygFindActiveIndex = clamped;
        wysiwygFindMatches.forEach((m, i) => m.classList.toggle(WYSIWYG_FIND_ACTIVE_CLASS, i === clamped));
        const active = wysiwygFindMatches[clamped];
        if (active) {
            active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function nextWysiwygFindMatch(delta = 1) {
        if (wysiwygFindMatches.length === 0) return;
        setWysiwygFindActive(wysiwygFindActiveIndex + delta);
    }

    function openWysiwygFind() {
        if (!wysiwygEl || !previewEditMode) return;
        const sel = window.getSelection();
        let initial = '';
        if (sel && !sel.isCollapsed && wysiwygEl.contains(sel.anchorNode) && wysiwygEl.contains(sel.focusNode)) {
            initial = sel.toString().slice(0, 120);
        }
        const wasOpen = wysiwygFindOpen;
        wysiwygFindOpen = true;
        if (initial && !wasOpen) wysiwygFindQuery = initial;
        tick().then(() => {
            wysiwygFindInputEl?.focus();
            wysiwygFindInputEl?.select();
            updateWysiwygFindHighlights();
        });
    }

    function closeWysiwygFind() {
        const wasOpen = wysiwygFindOpen;
        wysiwygFindOpen = false;
        clearWysiwygFindHighlights();
        if (wasOpen) wysiwygEl?.focus({ preventScroll: true });
    }

    function handleWysiwygFindInputKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) nextWysiwygFindMatch(-1);
            else nextWysiwygFindMatch(1);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeWysiwygFind();
        }
    }

    $: if (!previewEditMode && wysiwygFindOpen) closeWysiwygFind();

    async function enterPreviewEditMode(force = false) {
        const sourceFileId = activeTab?.type === 'preview' ? activeTab.sourceFileId : null;
        if (!sourceFileId) return;
        if (!force && previewEditMode && wysiwygSourceFileId === sourceFileId && wysiwygEl) {
            return;
        }
        wysiwygSourceFileId = sourceFileId;
        previewEditMode = true;
        await tick();
        if (
            wysiwygEl &&
            wysiwygSourceFileId === sourceFileId &&
            activeTab?.type === 'preview' &&
            activeTab.sourceFileId === sourceFileId
        ) {
            renderWysiwygFromStore();
            wysiwygEl.focus();
        }
    }

    async function togglePreviewEditMode() {
        if (previewEditMode) {
            exitPreviewEditMode();
            return;
        }
        await enterPreviewEditMode(true);
    }

    let activeLangPicker: {
        wrapper: HTMLElement;
        button: HTMLElement;
        currentLang: string;
        rect: DOMRect;
        historyBefore: WysiwygHistoryState | null;
    } | null = null;
    let langSearchQuery = '';
    let langSearchInputEl: HTMLInputElement | null = null;
    let langPickerListEl: HTMLElement | null = null;
    let langSelectedIndex = 0;

    $: filteredLanguages = CODE_LANGUAGE_OPTIONS.filter((opt) => {
        if (!langSearchQuery.trim()) return true;
        const q = langSearchQuery.trim().toLowerCase();
        return opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
    });

    $: if (filteredLanguages) {
        if (filteredLanguages.length === 0) {
            if (langSelectedIndex !== 0) langSelectedIndex = 0;
        } else if (langSelectedIndex >= filteredLanguages.length) {
            langSelectedIndex = filteredLanguages.length - 1;
        } else if (langSelectedIndex < 0) {
            langSelectedIndex = 0;
        }
    }

    function scrollLangSelectedIntoView() {
        tick().then(() => {
            const el = langPickerListEl?.querySelector('.lang-picker-option.focused') as HTMLElement | null;
            el?.scrollIntoView({ block: 'nearest' });
        });
    }

    function openLangPicker(btn: HTMLElement, wrapper: HTMLElement) {
        const pre = wrapper.querySelector('pre');
        const currentLang = pre ? getCodeBlockLanguage(pre) : (wrapper.dataset.language || '');
        const rect = btn.getBoundingClientRect();
        langSearchQuery = '';
        const initialFiltered = CODE_LANGUAGE_OPTIONS;
        const normalizedCurrent = normalizeCodeLanguage(currentLang);
        const currentIdx = initialFiltered.findIndex((opt) => normalizeCodeLanguage(opt.value) === normalizedCurrent);
        langSelectedIndex = currentIdx >= 0 ? currentIdx : 0;
        activeLangPicker = { wrapper, button: btn, currentLang, rect, historyBefore: captureWysiwygHistoryState() };
        wrapper.classList.add('lang-picker-active');
        setTimeout(() => {
            if (langSearchInputEl) langSearchInputEl.focus();
            scrollLangSelectedIntoView();
        }, 20);
    }

    function closeLangPicker() {
        if (activeLangPicker) {
            activeLangPicker.wrapper.classList.remove('lang-picker-active');
            activeLangPicker = null;
        }
    }

    function selectCodeLanguage(langValue: string) {
        if (!activeLangPicker) return;
        const { wrapper, historyBefore } = activeLangPicker;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const elTop = wysiwygEl?.scrollTop ?? 0;
        const elLeft = wysiwygEl?.scrollLeft ?? 0;
        if (historyBefore && wysiwygEl) {
            wysiwygEl.focus({ preventScroll: true });
            restoreWysiwygSelection(historyBefore);
        }
        setCodeBlockLanguage(wrapper, langValue);
        closeLangPicker();
        // Keep the action bar visible for a moment after picking a language so
        // the user can see the result, then fade back to hover-only.
        wrapper.classList.add('lang-picker-active');
        setTimeout(() => {
            if (wrapper.isConnected) wrapper.classList.remove('lang-picker-active');
        }, 2500);
        handleWysiwygInput();
        finishWysiwygHistoryEntry(historyBefore);
        wysiwygEl?.focus({ preventScroll: true });
        if (wysiwygEl) {
            wysiwygEl.scrollTop = elTop;
            wysiwygEl.scrollLeft = elLeft;
        }
        window.scrollTo(scrollX, scrollY);
    }

    function handleLangSearchKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeLangPicker();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredLanguages.length > 0) {
                langSelectedIndex = (langSelectedIndex + 1) % filteredLanguages.length;
                scrollLangSelectedIntoView();
            } else if (langSearchQuery.trim()) {
                // single custom option, keep at 0
                langSelectedIndex = 0;
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredLanguages.length > 0) {
                langSelectedIndex = (langSelectedIndex - 1 + filteredLanguages.length) % filteredLanguages.length;
                scrollLangSelectedIntoView();
            } else if (langSearchQuery.trim()) {
                langSelectedIndex = 0;
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredLanguages.length > 0) {
                const idx = Math.min(Math.max(0, langSelectedIndex), filteredLanguages.length - 1);
                selectCodeLanguage(filteredLanguages[idx].value);
            } else if (langSearchQuery.trim()) {
                selectCodeLanguage(langSearchQuery.trim());
            }
        }
    }

    function getWysiwygNodePath(root: Node, node: Node): number[] | null {
        const path: number[] = [];
        let current: Node | null = node;
        while (current && current !== root) {
            const parent: Node | null = current.parentNode;
            if (!parent) return null;
            const index = Array.prototype.indexOf.call(parent.childNodes, current);
            if (index < 0) return null;
            path.unshift(index);
            current = parent;
        }
        return current === root ? path : null;
    }

    function getWysiwygNodeAtPath(root: Node, path: number[]): Node | null {
        let node = root;
        for (const index of path) {
            const child = node.childNodes[index];
            if (!child) return null;
            node = child;
        }
        return node;
    }

    function getWysiwygSnapshotHtml(): string | null {
        if (!wysiwygEl) return null;
        const snapshotRoot = wysiwygEl.cloneNode(true) as HTMLElement;
        snapshotRoot.querySelectorAll('img[data-cojudge-img]').forEach((image) => {
            const fakeLink = image.getAttribute('data-cojudge-img');
            if (fakeLink) image.setAttribute('src', fakeLink);
            image.removeAttribute('data-cojudge-img');
        });
        snapshotRoot.querySelectorAll('.code-block-actions').forEach((element) => element.remove());
        snapshotRoot.querySelectorAll('.lang-picker-active').forEach((element) => {
            element.classList.remove('lang-picker-active');
        });
        snapshotRoot.querySelectorAll(`.${WYSIWYG_FIND_MARK_CLASS}`).forEach((mark) => {
            const parent = mark.parentNode;
            if (!parent) return;
            while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            parent.removeChild(mark);
            if ((parent as HTMLElement).normalize) (parent as HTMLElement).normalize();
        });
        return snapshotRoot.innerHTML;
    }

    function captureWysiwygHistoryState(): WysiwygHistoryState | null {
        if (!wysiwygEl || !wysiwygSourceFileId) return null;
        const html = getWysiwygSnapshotHtml();
        if (html === null) return null;
        let selection: WysiwygSelection | null = null;
        const browserSelection = window.getSelection();
        if (browserSelection && browserSelection.rangeCount > 0) {
            const range = browserSelection.getRangeAt(0);
            const startPath = getWysiwygNodePath(wysiwygEl, range.startContainer);
            const endPath = getWysiwygNodePath(wysiwygEl, range.endContainer);
            if (startPath && endPath) {
                let backward = false;
                if (!browserSelection.isCollapsed && browserSelection.anchorNode && browserSelection.focusNode) {
                    if (browserSelection.anchorNode === browserSelection.focusNode) {
                        backward = browserSelection.anchorOffset > browserSelection.focusOffset;
                    } else {
                        const directionRange = document.createRange();
                        directionRange.setStart(browserSelection.anchorNode, browserSelection.anchorOffset);
                        directionRange.setEnd(browserSelection.focusNode, browserSelection.focusOffset);
                        backward = directionRange.collapsed;
                    }
                }
                selection = {
                    start: { path: startPath, offset: range.startOffset },
                    end: { path: endPath, offset: range.endOffset },
                    backward
                };
            }
        }
        const activeElement = document.activeElement;
        const activeElementPath = activeElement instanceof HTMLElement && wysiwygEl.contains(activeElement)
            ? getWysiwygNodePath(wysiwygEl, activeElement)
            : null;
        return {
            html,
            sourceContent: wysiwygDirty ? null : getPreviewSourceContent(wysiwygSourceFileId),
            selection,
            activeElementPath,
            sourceFileId: wysiwygSourceFileId
        };
    }

    function restoreWysiwygSelection(state: WysiwygHistoryState): boolean {
        if (!wysiwygEl || !state.selection) return false;
        const startNode = getWysiwygNodeAtPath(wysiwygEl, state.selection.start.path);
        const endNode = getWysiwygNodeAtPath(wysiwygEl, state.selection.end.path);
        if (!startNode || !endNode) return false;
        const maxOffset = (node: Node) => node.nodeType === Node.TEXT_NODE
            ? node.textContent?.length ?? 0
            : node.childNodes.length;
        const startOffset = Math.min(state.selection.start.offset, maxOffset(startNode));
        const endOffset = Math.min(state.selection.end.offset, maxOffset(endNode));
        const range = document.createRange();
        try {
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
        } catch {
            return false;
        }
        const selection = window.getSelection();
        if (!selection) return false;
        selection.removeAllRanges();
        if (state.selection.backward && typeof selection.setBaseAndExtent === 'function') {
            selection.setBaseAndExtent(endNode, endOffset, startNode, startOffset);
        } else {
            selection.addRange(range);
        }
        return true;
    }

    function restoreWysiwygFocus(state: WysiwygHistoryState) {
        if (!wysiwygEl) return;
        const activeNode = state.activeElementPath !== null
            ? getWysiwygNodeAtPath(wysiwygEl, state.activeElementPath)
            : null;
        if (activeNode instanceof HTMLElement && (activeNode === wysiwygEl || wysiwygEl.contains(activeNode))) {
            (activeNode as HTMLElement).focus({ preventScroll: true } as FocusOptions);
        } else {
            wysiwygEl.focus({ preventScroll: true });
        }
    }

    function resetWysiwygHistory() {
        if (pendingWysiwygHistoryTimeout) clearTimeout(pendingWysiwygHistoryTimeout);
        pendingWysiwygHistoryTimeout = null;
        pendingWysiwygHistory = null;
        pendingWysiwygHistoryKind = null;
        showLinkInput = false;
        linkUrl = '';
        savedLinkRange = null;
        savedLinkHistoryBefore = null;
        closeLangPicker();
        wysiwygUndoStack = [];
        wysiwygRedoStack = [];
        cleanupWysiwygHistoryImages(true);
    }

    function sameWysiwygSelection(a: WysiwygSelection | null, b: WysiwygSelection | null): boolean {
        if (!a || !b) return a === b;
        const samePoint = (left: WysiwygSelectionPoint, right: WysiwygSelectionPoint) =>
            left.offset === right.offset &&
            left.path.length === right.path.length &&
            left.path.every((value, index) => value === right.path[index]);
        return a.backward === b.backward && samePoint(a.start, b.start) && samePoint(a.end, b.end);
    }

    function wysiwygHistoryReferencesImage(link: string): boolean {
        if (wysiwygEl?.innerHTML.includes(link)) return true;
        if (getFiles().some((file) => !isFolderEntry(file) && file.content?.includes(link))) return true;
        return [...wysiwygUndoStack, ...wysiwygRedoStack].some((entry) =>
            entry.before.html.includes(link) || entry.after.html.includes(link) ||
            entry.before.sourceContent?.includes(link) || entry.after.sourceContent?.includes(link)
        );
    }

    function wysiwygHistoryStateImageLinks(state: WysiwygHistoryState): Set<string> {
        const root = document.createElement('div');
        root.innerHTML = state.html;
        const links = new Set<string>();
        root.querySelectorAll('img').forEach((image) => {
            const link = image.getAttribute('data-cojudge-img') || image.getAttribute('src') || '';
            if (parsePastedImageLink(link)) links.add(link);
        });
        return links;
    }

    function trackRemovedWysiwygImages(before: WysiwygHistoryState, after: WysiwygHistoryState) {
        if (!before.html.includes('cojudge://image/')) return;
        const afterLinks = wysiwygHistoryStateImageLinks(after);
        for (const link of wysiwygHistoryStateImageLinks(before)) {
            if (!afterLinks.has(link)) wysiwygTrackedImageLinks.add(link);
        }
    }

    function cleanupWysiwygHistoryImages(finalize = false) {
        for (const link of wysiwygTrackedImageLinks) {
            const referenced = wysiwygHistoryReferencesImage(link);
            if (!referenced) void deletePastedImage(link);
            if (finalize || !referenced) wysiwygTrackedImageLinks.delete(link);
        }
    }

    function findPendingWysiwygImage(root: HTMLElement, token: string): HTMLElement | null {
        return Array.from(root.querySelectorAll<HTMLElement>(`[${WYSIWYG_PENDING_IMAGE_ATTR}]`))
            .find((element) => element.getAttribute(WYSIWYG_PENDING_IMAGE_ATTR) === token) ?? null;
    }

    function replacePendingWysiwygImage(root: HTMLElement, token: string, link: string | null): boolean {
        const placeholder = findPendingWysiwygImage(root, token);
        if (!placeholder) return false;
        if (link) {
            const image = document.createElement('img');
            image.src = link;
            image.alt = '';
            placeholder.replaceWith(image);
            wrapImageThumbnails(root);
        } else {
            placeholder.removeAttribute(WYSIWYG_PENDING_IMAGE_ATTR);
            placeholder.removeAttribute('contenteditable');
        }
        return true;
    }

    function replacePendingWysiwygImageInState(
        state: WysiwygHistoryState,
        token: string,
        link: string | null
    ): boolean {
        const root = document.createElement('div');
        root.innerHTML = state.html;
        const previous = link ? { ...state } : null;
        if (!replacePendingWysiwygImage(root, token, link)) return false;
        state.html = root.innerHTML;
        if (link && state.sourceContent !== null) state.sourceContent = htmlToMarkdown(state.html);
        if (previous) trackRemovedWysiwygImages(previous, state);
        return true;
    }

    function settlePendingWysiwygImage(
        token: string,
        sourceFileId: string,
        link: string | null
    ) {
        let referenced = false;
        for (const entry of [...wysiwygUndoStack, ...wysiwygRedoStack]) {
            referenced = replacePendingWysiwygImageInState(entry.before, token, link) || referenced;
            referenced = replacePendingWysiwygImageInState(entry.after, token, link) || referenced;
        }
        if (pendingWysiwygHistory) {
            referenced = replacePendingWysiwygImageInState(pendingWysiwygHistory, token, link) || referenced;
        }
        if (savedLinkHistoryBefore) {
            referenced = replacePendingWysiwygImageInState(savedLinkHistoryBefore, token, link) || referenced;
        }
        if (activeLangPicker?.historyBefore) {
            referenced = replacePendingWysiwygImageInState(activeLangPicker.historyBefore, token, link) || referenced;
        }

        const currentBefore = link ? captureWysiwygHistoryState() : null;
        if (
            previewEditMode &&
            wysiwygSourceFileId === sourceFileId &&
            wysiwygEl &&
            replacePendingWysiwygImage(wysiwygEl, token, link)
        ) {
            referenced = true;
            ensureTrailingEmptyLine(wysiwygEl);
            if (link) {
                const currentAfter = captureWysiwygHistoryState();
                if (currentBefore && currentAfter) trackRemovedWysiwygImages(currentBefore, currentAfter);
                wysiwygDirty = true;
                void resolvePastedImages(wysiwygEl);
                commitWysiwygEdits();
            }
        }

        if (!link) {
            wysiwygUndoStack = wysiwygUndoStack.filter((entry) => entry.before.html !== entry.after.html);
            wysiwygRedoStack = wysiwygRedoStack.filter((entry) => entry.before.html !== entry.after.html);
            return;
        }
        if (referenced) {
            wysiwygTrackedImageLinks.add(link);
            cleanupWysiwygHistoryImages();
        } else {
            void deletePastedImage(link);
        }
    }

    function trimWysiwygHistory() {
        let chars = wysiwygUndoStack.reduce(
            (total, entry) => total + historyStateChars(entry.before) + historyStateChars(entry.after),
            0
        );
        while (wysiwygUndoStack.length > WYSIWYG_HISTORY_LIMIT || chars > WYSIWYG_HISTORY_MAX_CHARS) {
            const removed = wysiwygUndoStack.shift();
            if (!removed) break;
            chars -= historyStateChars(removed.before) + historyStateChars(removed.after);
        }
        cleanupWysiwygHistoryImages();
    }

    function finishWysiwygHistoryEntry(
        before: WysiwygHistoryState | null,
        kind = 'command',
        after = captureWysiwygHistoryState()
    ) {
        if (!before || applyingWysiwygHistory || before.sourceFileId !== wysiwygSourceFileId) return;
        if (!after || before.html === after.html) return;
        if (savedLinkHistoryBefore && before !== savedLinkHistoryBefore) {
            showLinkInput = false;
            linkUrl = '';
            savedLinkRange = null;
            savedLinkHistoryBefore = null;
        }
        if (activeLangPicker?.historyBefore && before !== activeLangPicker.historyBefore) closeLangPicker();
        trackRemovedWysiwygImages(before, after);
        const timestamp = Date.now();
        const previous = wysiwygUndoStack[wysiwygUndoStack.length - 1];
        const mergeGroup = historyMergeGroup(kind);
        if (
            mergeGroup &&
            previous &&
            historyMergeGroup(previous.kind) === mergeGroup &&
            timestamp - previous.timestamp < 1500 &&
            previous.after.html === before.html &&
            sameWysiwygSelection(previous.after.selection, before.selection)
        ) {
            previous.after = after;
            previous.timestamp = timestamp;
        } else {
            wysiwygUndoStack.push({ before, after, kind, timestamp });
        }
        trimWysiwygHistory();
        if (wysiwygRedoStack.length > 0) {
            wysiwygRedoStack = [];
            cleanupWysiwygHistoryImages();
        }
    }

    function runWysiwygHistoryTransaction<T>(
        edit: () => T,
        before = captureWysiwygHistoryState(),
        kind = 'command'
    ): T {
        manualWysiwygHistoryDepth++;
        try {
            return edit();
        } finally {
            manualWysiwygHistoryDepth--;
            finishWysiwygHistoryEntry(before, kind);
        }
    }

    function queueWysiwygHistoryEntry(before: WysiwygHistoryState | null, kind: string) {
        if (!before || applyingWysiwygHistory) return;
        if (pendingWysiwygHistoryTimeout) clearTimeout(pendingWysiwygHistoryTimeout);
        pendingWysiwygHistory = before;
        pendingWysiwygHistoryKind = kind;
        pendingWysiwygHistoryTimeout = setTimeout(() => {
            if (pendingWysiwygHistory === before) {
                pendingWysiwygHistory = null;
                pendingWysiwygHistoryKind = null;
            }
            pendingWysiwygHistoryTimeout = null;
        }, 0);
    }

    function handleWysiwygBeforeInput(event: InputEvent) {
        if (applyingWysiwygFind) return;
        if (manualWysiwygHistoryDepth > 0) return;
        if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
            event.preventDefault();
            if (event.inputType === 'historyUndo') undoWysiwygHistory();
            else redoWysiwygHistory();
            return;
        }
        if (!pendingWysiwygHistory) {
            queueWysiwygHistoryEntry(captureWysiwygHistoryState(), event.inputType || 'input');
        }
        if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
            exitInlineCodeAtEnd();
        }
    }

    function wysiwygHistoryStateMatches(state: WysiwygHistoryState): boolean {
        return !!wysiwygEl &&
            state.sourceFileId === wysiwygSourceFileId &&
            getWysiwygSnapshotHtml() === state.html;
    }

    function applyWysiwygHistoryState(state: WysiwygHistoryState): boolean {
        if (!wysiwygEl || state.sourceFileId !== wysiwygSourceFileId) return false;
        applyingWysiwygHistory = true;
        const prevScrollTop = wysiwygEl.scrollTop;
        const prevScrollLeft = wysiwygEl.scrollLeft;
        const winX = window.scrollX;
        const winY = window.scrollY;
        try {
            if (pendingWysiwygHistoryTimeout) clearTimeout(pendingWysiwygHistoryTimeout);
            pendingWysiwygHistoryTimeout = null;
            pendingWysiwygHistory = null;
            pendingWysiwygHistoryKind = null;
            closeMentionPopup();
            closeLangPicker();
            showLinkInput = false;
            linkUrl = '';
            savedLinkRange = null;
            savedLinkHistoryBefore = null;
            wysiwygEl.innerHTML = state.html;
            wrapCodeBlocksWithCopy(wysiwygEl);
            wysiwygDirty = true;
            restoreWysiwygSelection(state);
            restoreWysiwygFocus(state);
            commitWysiwygEdits(state.sourceContent ?? undefined);
            restoreWysiwygSelection(state);
            restoreWysiwygFocus(state);
            void resolvePastedImages(wysiwygEl);
            return true;
        } finally {
            applyingWysiwygHistory = false;
            // innerHTML replacement resets scroll to 0; restore previous
            // viewport so undo/redo doesn't jump to top.
            if (wysiwygEl) {
                wysiwygEl.scrollTop = prevScrollTop;
                wysiwygEl.scrollLeft = prevScrollLeft;
                if (window.scrollX !== winX || window.scrollY !== winY) window.scrollTo(winX, winY);
            }
        }
    }

    function undoWysiwygHistory(): boolean {
        const entry = wysiwygUndoStack[wysiwygUndoStack.length - 1];
        if (!entry || !wysiwygHistoryStateMatches(entry.after)) return false;
        if (!applyWysiwygHistoryState(entry.before)) return false;
        wysiwygUndoStack.pop();
        wysiwygRedoStack.push(entry);
        return true;
    }

    function redoWysiwygHistory(): boolean {
        const entry = wysiwygRedoStack[wysiwygRedoStack.length - 1];
        if (!entry || !wysiwygHistoryStateMatches(entry.before)) return false;
        if (!applyWysiwygHistoryState(entry.after)) return false;
        wysiwygRedoStack.pop();
        wysiwygUndoStack.push(entry);
        return true;
    }

    function handleWysiwygInput(event?: Event) {
        if (applyingWysiwygFind) return;
        const target = event?.target;
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
            if (pendingWysiwygHistoryTimeout) clearTimeout(pendingWysiwygHistoryTimeout);
            pendingWysiwygHistoryTimeout = null;
            pendingWysiwygHistory = null;
            pendingWysiwygHistoryKind = null;
            return;
        }
        const historyBefore = pendingWysiwygHistory;
        const historyKind = pendingWysiwygHistoryKind ?? 'input';
        if (historyBefore) {
            pendingWysiwygHistory = null;
            pendingWysiwygHistoryKind = null;
            if (pendingWysiwygHistoryTimeout) clearTimeout(pendingWysiwygHistoryTimeout);
            pendingWysiwygHistoryTimeout = null;
        }
        if (!applyingWysiwygHistory && wysiwygRedoStack.length > 0) {
            wysiwygRedoStack = [];
            cleanupWysiwygHistoryImages();
        }
        if (target instanceof HTMLInputElement && target.classList.contains(CODE_LANGUAGE_INPUT_CLASS)) {
            const wrapper = target.closest(`.${CODE_COPY_WRAPPER_CLASS}`) as HTMLElement | null;
            if (wrapper) setCodeBlockLanguage(wrapper, target.value);
        }
        wysiwygDirty = true;
        removeOrphanCodeWrappers();
        healTaskListStructure();
        if (wysiwygEl?.querySelector('li input[type="checkbox"][disabled]')) {
            prepareTaskListCheckboxes(wysiwygEl);
        }
        maybeAutoInsertHorizontalRule();
        maybeAutoInsertCodeBlock();
        const beforeInlineCode = historyBefore ? captureWysiwygHistoryState() : null;
        const autoClosedInlineCode = maybeAutoCloseInlineCode();
        rehighlightWysiwygCodeBlocks();
        updateMentionPopup();
        if (autoClosedInlineCode && beforeInlineCode) {
            finishWysiwygHistoryEntry(historyBefore, historyKind, beforeInlineCode);
            finishWysiwygHistoryEntry(beforeInlineCode, 'inlineCode');
        } else {
            finishWysiwygHistoryEntry(historyBefore, historyKind);
        }
        if (wysiwygFindOpen) {
            // Keep find highlights in sync with the latest content, but don't
            // include the marks themselves in history.
            tick().then(() => updateWysiwygFindHighlights(true));
        }
        if (wysiwygDebounce) clearTimeout(wysiwygDebounce);
        const sourceFileId = wysiwygSourceFileId;
        wysiwygDebounce = setTimeout(() => {
            if (wysiwygSourceFileId === sourceFileId) commitWysiwygEdits();
        }, 300);
    }

    let applyingHorizontalRule = false;
    function maybeAutoInsertHorizontalRule() {
        if (applyingHorizontalRule || !wysiwygEl) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!range.collapsed || !wysiwygEl.contains(range.startContainer)) return;

        const parent = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer as HTMLElement
            : range.startContainer.parentElement;
        if (!parent || parent.closest('pre, code')) return;

        let line: HTMLElement | null = parent;
        while (line && line.parentElement !== wysiwygEl) line = line.parentElement;
        if (!line || line.parentElement !== wysiwygEl || !/^(P|DIV)$/.test(line.tagName)) return;
        // Only the visible text must be the fence: ignore inline formatting
        // wrappers (e.g. <strong>---</strong> when bold is still active after a
        // bold line). Never trigger inside inline code.
        if (line.querySelector('pre, code, br')) return;
        if ((line.textContent || '').replace(/\u200B/g, '') !== '---') return;

        insertWysiwygHorizontalRule(line);
    }

    function insertWysiwygHorizontalRule(lineToReplace?: HTMLElement) {
        if (!wysiwygEl) return false;
        wysiwygEl.focus();
        const selection = window.getSelection();
        if (!selection) return false;
        const selectedRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!lineToReplace && selectedRange && Array.from(wysiwygEl.querySelectorAll('table')).some((table) => selectedRange.intersectsNode(table))) return false;
        if (lineToReplace) {
            const lineRange = document.createRange();
            lineRange.selectNodeContents(lineToReplace);
            selection.removeAllRanges();
            selection.addRange(lineRange);
        } else if (selection.rangeCount === 0 || !wysiwygEl.contains(selection.anchorNode)) {
            return false;
        }

        const existingRules = new Set(wysiwygEl.querySelectorAll('hr'));
        applyingHorizontalRule = true;
        manualWysiwygHistoryDepth++;
        try {
            document.execCommand('insertHorizontalRule');
        } finally {
            manualWysiwygHistoryDepth--;
            applyingHorizontalRule = false;
        }

        const insertedRule = Array.from(wysiwygEl.querySelectorAll('hr')).find((rule) => !existingRules.has(rule));
        if (!insertedRule) return false;

        let next = insertedRule.nextSibling;
        if (!next || (next instanceof HTMLElement && (next.tagName === 'HR' || next.contentEditable === 'false'))) {
            const paragraph = document.createElement('p');
            paragraph.innerHTML = '<br>';
            insertedRule.after(paragraph);
            next = paragraph;
        }

        const nextRange = document.createRange();
        nextRange.selectNodeContents(next);
        nextRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        return true;
    }

    let applyingCodeBlock = false;
    // Notion-style: typing an exact ``` line turns it into a code block.
    function maybeAutoInsertCodeBlock() {
        if (applyingCodeBlock || !wysiwygEl) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!range.collapsed || !wysiwygEl.contains(range.startContainer)) return;

        const parent = range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer as HTMLElement
            : range.startContainer.parentElement;
        if (!parent || parent.closest('pre, code')) return;

        let line: HTMLElement | null = parent;
        while (line && line.parentElement !== wysiwygEl) line = line.parentElement;
        if (!line || line.parentElement !== wysiwygEl || !/^(P|DIV)$/.test(line.tagName)) return;
        // Only the visible text must be the fence: ignore inline formatting
        // wrappers (e.g. <strong>```</strong> when bold is still active after a
        // bold line). Never trigger inside inline code.
        if (line.querySelector('pre, code')) return;
        if ((line.textContent || '').replace(/\u200B/g, '') !== '```') return;

        insertWysiwygCodeBlock(line);
    }

    function insertWysiwygCodeBlock(lineToReplace: HTMLElement) {
        if (!wysiwygEl) return false;
        wysiwygEl.focus();
        const selection = window.getSelection();
        if (!selection) return false;
        const lineRange = document.createRange();
        lineRange.selectNodeContents(lineToReplace);
        selection.removeAllRanges();
        selection.addRange(lineRange);

        applyingCodeBlock = true;
        manualWysiwygHistoryDepth++;
        try {
            document.execCommand('formatBlock', false, 'pre');
        } finally {
            manualWysiwygHistoryDepth--;
            applyingCodeBlock = false;
        }

        const insertedPre = Array.from(wysiwygEl.querySelectorAll('pre')).find(
            (pre) => (pre.textContent || '').replace(/\u200B/g, '') === '```'
        );
        if (!insertedPre) return false;

        // Notion-style: the fence disappears and the caret lands inside the
        // freshly created code block, ready to type. A ZWSP keeps the empty
        // block in the DOM (and markdown) until the user types something.
        insertedPre.textContent = '';
        const zwsp = document.createTextNode('\u200B');
        insertedPre.appendChild(zwsp);
        wrapCodeBlocksWithCopy(wysiwygEl);
        // Keep a paragraph after the code block so the caret can move past it
        if (!insertedPre.parentElement?.nextElementSibling) {
            const paragraph = document.createElement('p');
            paragraph.innerHTML = '<br>';
            insertedPre.parentElement?.after(paragraph);
        }
        const caret = document.createRange();
        caret.setStart(zwsp, 0);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
        return true;
    }

    const {
        getPreFromSelection,
        rehighlightWysiwygCodeBlocks,
        emptyLineInPre,
        selectAllInWysiwygCodeBlock,
        insertNewlineInPre,
        escapeWysiwygCodeBlock,
        removeOrphanCodeWrappers,
        isInlineCodeElement,
        exitInlineCodeAtEnd,
    } = createCodeSelection(
        () => wysiwygEl, () => applyingWysiwygHistory, () => activeLangPicker?.wrapper ?? null
    );

    // When the user types a closing backtick, try to match it with a previous
    // backtick in the same text node and form an inline code element. Runs on
    // the input event, after the backtick has been typed, so a single ctrl+z
    // (undo) cancels the auto-format and restores exactly what was typed.
    // Chrome sanitizes <code> tags in execCommand HTML, so a marker span is
    // inserted instead and converted back to inline code by htmlToMarkdown.
    let applyingInlineCode = false;
    function maybeAutoCloseInlineCode(): boolean {
        if (applyingInlineCode || !wysiwygEl) return false;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);
        if (!range.collapsed) return false;
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE || !wysiwygEl.contains(node)) return false;
        const parentEl = node.parentElement;
        if (!parentEl || parentEl.closest('pre')) return false;
        // Never wrap inside an existing inline code element (a toolbar <code>
        // or a previous marker span): the caret inside one would nest another
        // span and corrupt the stored markdown.
        let ancestor: Element | null = parentEl;
        while (ancestor && ancestor !== wysiwygEl) {
            if (isInlineCodeElement(ancestor)) return false;
            ancestor = ancestor.parentElement;
        }
        const text = node.textContent ?? '';
        const offset = range.startOffset;
        if (offset < 1 || text.charAt(offset - 1) !== '`') return false;
        const openIdx = text.slice(0, offset - 1).lastIndexOf('`');
        if (openIdx === -1) return false;
        const codeText = text.slice(openIdx + 1, offset - 1);
        if (!codeText || codeText !== codeText.trim()) return false;
        let didInsert = false;
        applyingInlineCode = true;
        try {
            const replaceRange = document.createRange();
            replaceRange.setStart(node, openIdx);
            replaceRange.setEnd(node, offset);
            selection.removeAllRanges();
            selection.addRange(replaceRange);
            // Track the spans that exist before inserting so the freshly
            // inserted one can be found reliably: insertHTML can place it
            // before other spans in the document, so picking the last span
            // in document order would re-mark an unrelated span and leave the
            // new one without the marker (breaking the markdown round-trip).
            const existingSpans = new Set(wysiwygEl.querySelectorAll('span'));
            manualWysiwygHistoryDepth++;
            try {
                document.execCommand('insertHTML', false, inlineCodeSpanHtml(codeText));
            } finally {
                manualWysiwygHistoryDepth--;
            }
            const inserted = Array.from(wysiwygEl.querySelectorAll('span')).find((span) => !existingSpans.has(span));
            const markerSpan = inserted instanceof HTMLElement ? inserted : null;
            if (markerSpan) {
                didInsert = true;
                // Rewrite the inserted span's background from the concrete
                // color (which the sanitizer kept) to the theme-variable
                // marker, so the code adapts to the active theme and
                // round-trips back to backticks.
                markerSpan.style.backgroundColor = INLINE_CODE_STYLE_MARKER;
                // Anchor the caret just after the marker span so further
                // typing continues outside the (already closed) inline code.
                // Chrome redirects typing at the end of a paragraph after a
                // trailing inline element back INTO that element (a caret
                // after the span, in an empty node, or before a ZWSP all
                // resolve inside the span), so the caret must sit AFTER a
                // ZWSP in the text node that follows the span. htmlToMarkdown
                // strips the ZWSP, so it never reaches the stored markdown.
                let after: Node | null = markerSpan.nextSibling;
                if (after && after.nodeType === Node.TEXT_NODE && after.textContent !== '') {
                    // Existing text right after the span: caret at its start.
                } else {
                    if (after && after.nodeType === Node.TEXT_NODE) {
                        after.textContent = '\u200B';
                    } else {
                        after = document.createTextNode('\u200B');
                        markerSpan.after(after);
                    }
                }
                const caret = document.createRange();
                caret.setStart(after, after.textContent === '\u200B' ? 1 : 0);
                caret.collapse(true);
                selection.removeAllRanges();
                selection.addRange(caret);
            }
        } finally {
            applyingInlineCode = false;
        }
        return didInsert;
    }

    // Toggle inline code on the current selection (or the word at the caret).
    function toggleInlineCode() {
        if (!wysiwygEl) return;
        wysiwygEl.focus();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        // If the caret/selection is inside an inline <code>, unwrap it
        let node: Node | null = selection.anchorNode;
        let existing: HTMLElement | null = null;
        while (node && node !== wysiwygEl) {
            if (node instanceof HTMLElement && node.tagName === 'CODE' && node.parentElement?.tagName !== 'PRE') {
                existing = node;
                break;
            }
            node = node.parentNode;
        }
        if (existing) {
            const parent = existing.parentNode;
            if (parent) {
                while (existing.firstChild) parent.insertBefore(existing.firstChild, existing);
                parent.removeChild(existing);
                parent.normalize();
            }
            handleWysiwygInput();
            return;
        }
        let range = selection.getRangeAt(0);
        if (range.collapsed) {
            // Expand to the word around the caret
            const textNode = range.startContainer;
            if (textNode.nodeType !== Node.TEXT_NODE) return;
            const text = textNode.textContent ?? '';
            let start = range.startOffset;
            let end = range.startOffset;
            while (start > 0 && !/\s/.test(text.charAt(start - 1))) start--;
            while (end < text.length && !/\s/.test(text.charAt(end))) end++;
            if (start === end) return;
            range.setStart(textNode, start);
            range.setEnd(textNode, end);
            selection.removeAllRanges();
            selection.addRange(range);
            range = selection.getRangeAt(0);
        }
        const frag = range.extractContents();
        // If the selection spans block-level content (e.g. Ctrl+A over several
        // paragraphs), wrapping everything in one inline <code> would nest block
        // elements inside it and corrupt the stored markdown. Wrap each block's
        // text in its own <code> instead.
        const blocks = Array.from(frag.children).filter(
            (el): el is HTMLElement => el instanceof HTMLElement && /^(P|DIV|LI|H[1-6]|PRE)$/.test(el.tagName)
        );
        const codeEl = document.createElement('code');
        if (blocks.length > 0) {
            for (const block of blocks) {
                if (block.tagName === 'PRE' || !block.textContent?.trim()) continue;
                const nestedCode = document.createElement('code');
                while (block.firstChild) nestedCode.appendChild(block.firstChild);
                block.appendChild(nestedCode);
            }
            range.insertNode(frag);
            // Reselect the first wrapped block so toggling again unwraps it
            const firstWrapped = blocks.find((b) => b.tagName !== 'PRE' && b.textContent?.trim());
            if (firstWrapped?.firstElementChild) {
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(firstWrapped.firstElementChild);
                selection.addRange(newRange);
            }
        } else {
            codeEl.appendChild(frag);
            range.insertNode(codeEl);
            // Reselect the wrapped content so toggling again unwraps it
            selection.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(codeEl);
            selection.addRange(newRange);
        }
        handleWysiwygInput();
    }

    // Toggle a code block around the current block, or unwrap the <pre> the
    // caret is inside back into a paragraph.
    function toggleCodeBlock() {
        if (!wysiwygEl) return false;
        wysiwygEl.focus();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);
        if (!wysiwygEl.contains(range.startContainer)) return false;

        let node: Node | null = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        const pre = node instanceof HTMLElement ? node.closest('pre') : null;
        if (pre && wysiwygEl.contains(pre)) {
            // Unwrap: replace the code block (and its copy-button wrapper, if
            // the block was rendered from markdown) with a plain paragraph.
            const block = pre.parentElement?.classList.contains(CODE_COPY_WRAPPER_CLASS) ? pre.parentElement : pre;
            const p = document.createElement('p');
            for (const child of Array.from(pre.childNodes)) {
                // Rendered code blocks are <pre><code>…</code></pre>; unwrap the
                // <code> so toggling off yields a plain paragraph, not inline code
                if (child instanceof HTMLElement && child.tagName === 'CODE') {
                    p.append(...Array.from(child.childNodes));
                } else {
                    p.appendChild(child);
                }
            }
            block.replaceWith(p);
            const caret = document.createRange();
            caret.selectNodeContents(p);
            caret.collapse(false);
            selection.removeAllRanges();
            selection.addRange(caret);
            handleWysiwygInput();
            return true;
        }

        // execCommand produces a bare <pre>; htmlToMarkdown's bareCodeBlock
        // rule round-trips it back to a fenced code block. Wrap it right away
        // so the copy button shows up immediately, like rendered code blocks.
        document.execCommand('formatBlock', false, 'pre');
        wrapCodeBlocksWithCopy(wysiwygEl);
        handleWysiwygInput();
        return true;
    }

    // If the click target is a playground file link, switch to that tab in-app.
    function tryOpenPlaygroundFileLink(event: MouseEvent, container: HTMLElement | null): boolean {
        if (!container) return false;
        const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
        if (!anchor || !container.contains(anchor)) return false;
        const fileId = parsePlaygroundFileId(anchor.getAttribute('href') || '');
        if (!fileId) return false;
        event.preventDefault();
        event.stopPropagation();
        closeMentionPopup();
        activateTab(fileId);
        return true;
    }

    // Browsers do not consistently activate links inside contenteditable
    // elements. Desktop mode delegates target=_blank to Tauri's opener hook,
    // so only provide the explicit browser fallback here.
    function tryOpenExternalLink(event: MouseEvent, container: HTMLElement | null): boolean {
        if (isDesktopMode || !container) return false;
        const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
        if (!anchor || !container.contains(anchor) || anchor.target !== '_blank') return false;
        if (parsePlaygroundFileId(anchor.getAttribute('href') || '')) return false;
        event.preventDefault();
        event.stopPropagation();
        window.open(anchor.href, '_blank', 'noopener,noreferrer');
        return true;
    }

    // Keep checkbox HTML attributes in sync after native toggle so innerHTML
    // (and turndown) sees the current checked state.
    function handleWysiwygChange(event: Event) {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
        if (!wysiwygEl?.contains(target)) return;
        const historyBefore = captureWysiwygHistoryState();
        if (target.checked) target.setAttribute('checked', '');
        else target.removeAttribute('checked');
        handleWysiwygInput();
        finishWysiwygHistoryEntry(historyBefore);
    }

    const {
        getListItemFromSelection,
        handleTaskListEnter,
        insertOrToggleTaskList,
        handleTaskListBackspace,
        handleTaskBoundaryDelete,
        handlePlainItemBackspaceIntoTask,
        handleWysiwygTab,
        healTaskListStructure,
    } = createTaskListEditor(() => wysiwygEl, () => handleWysiwygInput());

    // Click handling inside the WYSIWYG area: trash icon deletes the image,
    // clicking the thumbnail opens the full-size lightbox. Checkboxes toggle
    // via the native control + change handler.
    function handleWysiwygClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const langBtn = target.closest('.code-lang-btn') as HTMLElement | null;
        if (langBtn) {
            event.preventDefault();
            event.stopPropagation();
            const wrapper = langBtn.closest(`.${CODE_COPY_WRAPPER_CLASS}`) as HTMLElement | null;
            if (wrapper) {
                if (activeLangPicker && activeLangPicker.button === langBtn) {
                    closeLangPicker();
                } else {
                    openLangPicker(langBtn, wrapper);
                }
            }
            return;
        }
        const deleteCodeBtn = target.closest('.delete-code-button') as HTMLElement | null;
        if (deleteCodeBtn && wysiwygEl?.contains(deleteCodeBtn)) {
            event.preventDefault();
            const wrapper = deleteCodeBtn.closest(`.${CODE_COPY_WRAPPER_CLASS}`) as HTMLElement | null;
            if (wrapper) deleteWysiwygCodeBlock(wrapper);
            return;
        }
        if (activeLangPicker && !target.closest('.lang-picker-popover')) {
            closeLangPicker();
        }
        if (tryOpenPlaygroundFileLink(event, wysiwygEl)) return;
        if (tryOpenExternalLink(event, wysiwygEl)) return;
        if (target instanceof HTMLInputElement && target.classList.contains(CODE_LANGUAGE_INPUT_CLASS)) return;
        const cleanupBefore = captureWysiwygHistoryState();
        removeOrphanCodeWrappers();
        if (cleanupBefore && getWysiwygSnapshotHtml() !== cleanupBefore.html) {
            wysiwygDirty = true;
            commitWysiwygEdits();
            finishWysiwygHistoryEntry(cleanupBefore);
        }
        if (target instanceof HTMLInputElement && target.type === 'checkbox' && wysiwygEl?.contains(target)) {
            // Let the native checkbox toggle; change handler syncs markdown.
            return;
        }
        const deleteBtn = target.closest(`.${THUMB_DELETE_CLASS}`) as HTMLElement | null;
        if (deleteBtn && wysiwygEl?.contains(deleteBtn)) {
            event.preventDefault();
            const img = deleteBtn.closest(`.${THUMB_WRAPPER_CLASS}`)?.querySelector('img');
            const fakeLink = img?.dataset.cojudgeImg;
            if (fakeLink) wysiwygTrackedImageLinks.add(fakeLink);
            const scrollTop = wysiwygEl.scrollTop;
            const scrollLeft = wysiwygEl.scrollLeft;
            const winX = window.scrollX;
            const winY = window.scrollY;
            runWysiwygHistoryTransaction(() => {
                deleteBtn.closest(`.${THUMB_WRAPPER_CLASS}`)?.remove();
                if (!wysiwygEl) return;
                ensureTrailingEmptyLine(wysiwygEl);
                handleWysiwygInput();
                wysiwygEl.focus({ preventScroll: true });
            });
            commitWysiwygEdits();
            wysiwygEl.scrollTop = scrollTop;
            wysiwygEl.scrollLeft = scrollLeft;
            if (window.scrollX !== winX || window.scrollY !== winY) window.scrollTo(winX, winY);
            return;
        }
        const img = target.closest(`.${THUMB_WRAPPER_CLASS} img`) as HTMLImageElement | null;
        if (img && wysiwygEl?.contains(img)) {
            event.preventDefault();
            openLightbox(img.src);
        }
    }

    // Click handling in the read-only markdown preview.
    function handlePreviewClick(event: MouseEvent) {
        const container = event.currentTarget as HTMLElement;
        const target = event.target as HTMLElement;
        const langBtn = target.closest('.code-lang-btn') as HTMLElement | null;
        if (langBtn) {
            event.preventDefault();
            event.stopPropagation();
            const wrapper = langBtn.closest(`.${CODE_COPY_WRAPPER_CLASS}`) as HTMLElement | null;
            if (wrapper) {
                if (activeLangPicker && activeLangPicker.button === langBtn) {
                    closeLangPicker();
                } else {
                    openLangPicker(langBtn, wrapper);
                }
            }
            return;
        }
        const deleteCodeBtn = target.closest('.delete-code-button') as HTMLElement | null;
        if (deleteCodeBtn && container.contains(deleteCodeBtn)) {
            event.preventDefault();
            const wrapper = deleteCodeBtn.closest('.code-block-wrapper') as HTMLElement | null;
            if (wrapper) void deletePreviewCodeBlock(wrapper);
            return;
        }
        if (activeLangPicker && !target.closest('.lang-picker-popover')) {
            closeLangPicker();
        }
        if (tryOpenPlaygroundFileLink(event, container)) return;
        const deleteBtn = target.closest(`.${THUMB_DELETE_CLASS}`) as HTMLElement | null;
        if (deleteBtn && container.contains(deleteBtn)) {
            event.preventDefault();
            const img = deleteBtn.closest(`.${THUMB_WRAPPER_CLASS}`)?.querySelector('img');
            const fakeLink = img?.dataset.cojudgeImg;
            const src = fakeLink || img?.getAttribute('src');
            if (!src) return;
            if (fakeLink) deletePastedImage(fakeLink);
            deletePreviewImage(src);
            return;
        }
        const img = target.closest(`.${THUMB_WRAPPER_CLASS} img`) as HTMLImageElement | null;
        if (img && container.contains(img)) {
            event.preventDefault();
            openLightbox(img.src);
        }
    }

    // Removes the image with the given src from the preview's source markdown.
    function deletePreviewImage(src: string) {
        const sourceFileId = activeTab?.type === 'preview' ? activeTab.sourceFileId : null;
        if (!sourceFileId) return;
        const sourceEntry = getFiles().find((file) => file.fileId === sourceFileId && file.language === 'markdown');
        if (!sourceEntry) return;
            const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`!\\[[^\\]]*\\]\\(\\s*${escaped}(?:\\s+"[^"]*")?\\s*\\)`, 'g');
            const next = sourceEntry.content
                .replace(pattern, '')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n');
        if (next !== sourceEntry.content) onSave(sourceFileId, next);
    }

    // Deletes a code block from the WYSIWYG editor. This is a scripted DOM edit,
    // so record it in the editor history rather than relying on native undo.
    function deleteWysiwygCodeBlock(wrapper: HTMLElement) {
        if (!wysiwygEl || !wrapper.isConnected) return;
        if (activeLangPicker && activeLangPicker.wrapper === wrapper) closeLangPicker();
        const historyBefore = captureWysiwygHistoryState();
        const scrollTop = wysiwygEl.scrollTop;
        const scrollLeft = wysiwygEl.scrollLeft;
        const winX = window.scrollX;
        const winY = window.scrollY;
        wrapper.remove();
        ensureTrailingEmptyLine(wysiwygEl);
        handleWysiwygInput();
        finishWysiwygHistoryEntry(historyBefore);
        commitWysiwygEdits();
        wysiwygEl.focus({ preventScroll: true });
        wysiwygEl.scrollTop = scrollTop;
        wysiwygEl.scrollLeft = scrollLeft;
        if (window.scrollX !== winX || window.scrollY !== winY) window.scrollTo(winX, winY);
    }

    // Deletes a code block from the source markdown when its trash button is
    // clicked in the read-only preview.
    async function deletePreviewCodeBlock(wrapper: HTMLElement) {
        const sourceFileId = activeTab?.type === 'preview' ? activeTab.sourceFileId : null;
        if (!sourceFileId) return;
        const confirmed = await showConfirm('Delete this code block? This action cannot be undone.', {
            title: 'Delete code block',
            confirmLabel: 'Delete',
            tone: 'danger'
        });
        if (!confirmed) return;
        const pre = wrapper.querySelector('pre');
        const code = pre?.firstElementChild?.tagName === 'CODE' ? (pre.firstElementChild as HTMLElement) : null;
        const language = code
            ? (Array.from(code.classList).find((name) => name.startsWith('language-'))?.slice('language-'.length) ?? '')
            : '';
        const content = code ? (code.textContent || '') : (pre?.textContent || '');
        const sourceEntry = getFiles().find((file) => file.fileId === sourceFileId && file.language === 'markdown');
        if (!sourceEntry) return;
        const next = removeFencedCodeBlock(sourceEntry.content, language, content);
        if (next !== sourceEntry.content) onSave(sourceFileId, next);
    }

    function commitWysiwygEdits(markdownOverride?: string) {
        if (wysiwygDebounce) {
            clearTimeout(wysiwygDebounce);
            wysiwygDebounce = null;
        }
        if (!previewEditMode || !wysiwygEl || !wysiwygSourceFileId || !wysiwygDirty) return;
        removeOrphanCodeWrappers();
        healTaskListStructure();
        prepareTaskListCheckboxes(wysiwygEl);
        let htmlForMarkdown = wysiwygEl.innerHTML;
        // Strip find highlights so they don't leak into stored markdown
        if (wysiwygFindOpen && htmlForMarkdown.includes(WYSIWYG_FIND_MARK_CLASS)) {
            const temp = document.createElement('div');
            temp.innerHTML = htmlForMarkdown;
            temp.querySelectorAll(`.${WYSIWYG_FIND_MARK_CLASS}`).forEach((mark) => {
                const parent = mark.parentNode;
                if (!parent) return;
                while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
                parent.removeChild(mark);
                if ((parent as HTMLElement).normalize) (parent as HTMLElement).normalize();
            });
            htmlForMarkdown = temp.innerHTML;
        }
        const markdown = markdownOverride ?? htmlToMarkdown(htmlForMarkdown);
        const sourceFileId = wysiwygSourceFileId;
        onSave(sourceFileId, markdown);
        onInput(sourceFileId, markdown);
        wysiwygDirty = false;
    }

    function handleWysiwygBlur() {
        const historyBefore = captureWysiwygHistoryState();
        commitWysiwygEdits();
        finishWysiwygHistoryEntry(historyBefore);
    }

    // Switch WYSIWYG mode when changing tabs
    $: if ((activeTab?.fileId ?? null) !== lastActiveTabFileId) {
        if (previewEditMode) {
            commitWysiwygEdits();
            resetWysiwygHistory();
        }
        wysiwygSourceFileId = null;
        showLinkInput = false;
        savedLinkRange = null;
        savedLinkHistoryBefore = null;
        closeMentionPopup();
        closeWysiwygFind();
        lastActiveTabFileId = activeTab?.fileId ?? null;
        if (activeTab?.type === 'preview') {
            applyPreferredVisualMode();
        } else {
            previewEditMode = false;
        }
    }

    // Paste images into the WYSIWYG area as <img> elements backed by IndexedDB
    // (the source keeps a fake cojudge://image/<id> link; resolvePastedImages
    // swaps it for the payload). Plain URL strings are inserted as clickable
    // links (new tab).
    function handleWysiwygPaste(event: ClipboardEvent) {
        const historyBefore = captureWysiwygHistoryState();
        const pasted = event.clipboardData?.getData('text/plain') ?? '';

        // Code blocks are plain-text editing surfaces. Handling this ourselves
        // avoids rich clipboard HTML and keeps highlighting in one undo step.
        // `execCommand('insertText')` with a multiline string splits the <pre>
        // into multiple <pre> elements (one per line) inside the same wrapper,
        // which then round-trips to multiple fenced blocks (see reproduction).
        // Insert via Range as a single TextNode so newlines stay inside one <pre>.
        if (getPreFromSelection()) {
            event.preventDefault();
            runWysiwygHistoryTransaction(() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                if (!range.collapsed) range.deleteContents();
                const normalized = pasted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                if (normalized.length === 0) {
                    handleWysiwygInput();
                    return;
                }
                const textNode = document.createTextNode(normalized);
                range.insertNode(textNode);
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                handleWysiwygInput();
            }, historyBefore, 'insertFromPaste');
            return;
        }

        const items = event.clipboardData?.items;
        if (items) {
            for (const item of items) {
                if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
                const file = item.getAsFile();
                if (!file) continue;
                event.preventDefault();
                const sourceFileId = wysiwygSourceFileId;
                if (!sourceFileId) return;
                const token = uuidv4();
                let inserted = false;
                runWysiwygHistoryTransaction(() => {
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0 || !wysiwygEl) return;
                    const range = selection.getRangeAt(0);
                    if (!wysiwygEl.contains(range.startContainer) || !wysiwygEl.contains(range.endContainer)) return;
                    const placeholder = document.createElement('span');
                    placeholder.setAttribute(WYSIWYG_PENDING_IMAGE_ATTR, token);
                    placeholder.setAttribute('contenteditable', 'false');
                    const replacedContent = range.extractContents();
                    if (replacedContent.hasChildNodes()) placeholder.appendChild(replacedContent);
                    else placeholder.appendChild(document.createTextNode('\u200B'));
                    range.insertNode(placeholder);
                    range.setStartAfter(placeholder);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    inserted = true;
                    ensureTrailingEmptyLine(wysiwygEl);
                }, historyBefore, 'insertFromPaste');
                if (!inserted) return;

                const reader = new FileReader();
                const discard = () => settlePendingWysiwygImage(token, sourceFileId, null);
                reader.onerror = discard;
                reader.onload = () => {
                    if (typeof reader.result !== 'string') {
                        discard();
                        return;
                    }
                    void storePastedImage(reader.result)
                        .then((link) => settlePendingWysiwygImage(token, sourceFileId, link))
                        .catch(discard);
                };
                reader.readAsDataURL(file);
                return;
            }
        }

        if (!isUrlLike(pasted)) {
            queueWysiwygHistoryEntry(historyBefore, 'insertFromPaste');
            return;
        }

        event.preventDefault();
        const href = normalizeUrl(pasted);
        const selection = window.getSelection();
        const hasSelection =
            !!selection &&
            !selection.isCollapsed &&
            !!wysiwygEl &&
            !!selection.anchorNode &&
            wysiwygEl.contains(selection.anchorNode);

        runWysiwygHistoryTransaction(() => {
            if (hasSelection) {
                document.execCommand('createLink', false, href);
                ensureWysiwygLinksOpenInNewTab();
            } else {
                document.execCommand('insertHTML', false, linkHtml(href, pasted.trim()));
            }
            handleWysiwygInput();
        }, historyBefore, 'insertFromPaste');
    }

    function ensureWysiwygLinksOpenInNewTab() {
        if (!wysiwygEl) return;
        for (const a of Array.from(wysiwygEl.querySelectorAll('a[href]'))) {
            const href = a.getAttribute('href') || '';
            const fileId = parsePlaygroundFileId(href);
            if (fileId) {
                // Upgrade plain playground links (e.g. from createLink) into mention chips.
                if (!a.classList.contains(FILE_MENTION_CLASS)) {
                    const label = (a.textContent || href).trim();
                    a.outerHTML = fileMentionHtml(href, label, getLanguageForTab(fileId));
                } else {
                    a.removeAttribute('target');
                    a.removeAttribute('rel');
                    a.setAttribute('contenteditable', 'false');
                }
                continue;
            }
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        }
        ensureFileMentionCarets(wysiwygEl);
    }

    function closeMentionPopup() {
        showMentionPopup = false;
        mentionQuery = '';
        mentionSelectedIndex = 0;
        savedMentionRange = null;
        mentionPopupStyle = '';
    }

    function scrollSelectedMentionIntoView() {
        tick().then(() => {
            const el = mentionResultsEl?.querySelector('.mention-result-item.selected') as HTMLElement | null;
            el?.scrollIntoView({ block: 'nearest' });
        });
    }

    // Detect an in-progress @mention immediately before the caret.
    function getMentionMatch(): { query: string; range: Range } | null {
        if (!wysiwygEl) return null;
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return null;
        const caretRange = selection.getRangeAt(0);
        if (!wysiwygEl.contains(caretRange.startContainer)) return null;
        if (caretRange.startContainer.nodeType !== Node.TEXT_NODE) return null;
        const textNode = caretRange.startContainer as Text;
        const offset = caretRange.startOffset;
        const textBefore = textNode.textContent?.slice(0, offset) ?? '';
        const match = textBefore.match(/@([^\s@]*)$/);
        if (!match) return null;
        const atIndex = offset - match[0].length;
        if (atIndex > 0) {
            const charBefore = textBefore[atIndex - 1];
            // Avoid triggering inside emails like user@domain
            if (charBefore && /[\w.]/.test(charBefore)) return null;
        }
        const range = document.createRange();
        range.setStart(textNode, atIndex);
        range.setEnd(textNode, offset);
        return { query: match[1], range };
    }

    function updateMentionPopup() {
        if (!previewEditMode || !wysiwygEl) {
            if (showMentionPopup) closeMentionPopup();
            return;
        }
        const mention = getMentionMatch();
        if (!mention) {
            if (showMentionPopup) closeMentionPopup();
            return;
        }
        savedMentionRange = mention.range.cloneRange();
        mentionQuery = mention.query;
        showMentionPopup = true;
        const rect = mention.range.getBoundingClientRect();
        const top = Math.min(rect.bottom + 4, window.innerHeight - 240);
        const left = Math.min(Math.max(8, rect.left), window.innerWidth - 328);
        mentionPopupStyle = `top:${Math.max(8, top)}px;left:${left}px;`;
    }

    // Inline tags that should not wrap a file mention (looks wrong + breaks markdown).
    function isInlineFormatElement(el: Element): boolean {
        const tag = el.tagName;
        if (tag === 'B' || tag === 'STRONG' || tag === 'I' || tag === 'EM' || tag === 'U' ||
            tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || tag === 'CODE') {
            return true;
        }
        // WYSIWYG auto-matched inline code spans
        if (tag === 'SPAN' && (el.getAttribute('style') || '').includes(INLINE_CODE_STYLE_MARKER)) {
            return true;
        }
        return false;
    }

    // Lift node out of bold/italic/etc. so the mention is unformatted.
    function liftOutOfInlineFormatting(node: Node, root: HTMLElement) {
        while (node.parentElement && node.parentElement !== root && isInlineFormatElement(node.parentElement)) {
            const parent = node.parentElement;
            const grand = parent.parentNode;
            if (!grand) break;

            const afterParent = parent.cloneNode(false) as HTMLElement;
            let sibling = node.nextSibling;
            while (sibling) {
                const next = sibling.nextSibling;
                afterParent.appendChild(sibling);
                sibling = next;
            }

            grand.insertBefore(node, parent.nextSibling);
            if (afterParent.childNodes.length > 0) {
                grand.insertBefore(afterParent, node.nextSibling);
            }
            if (!parent.hasChildNodes()) parent.remove();
        }
    }

    function insertFileMention(file: TabMeta) {
        if (!wysiwygEl || !savedMentionRange) return;
        const historyBefore = captureWysiwygHistoryState();
        // Prefer the underlying source file so the link stays valid if a preview tab is closed.
        const targetId = file.type === 'preview' && file.sourceFileId ? file.sourceFileId : file.fileId;
        const href = playgroundFileHref(targetId);
        const html = fileMentionHtml(href, file.fileName, getLanguageForTab(targetId));
        const range = savedMentionRange.cloneRange();
        closeMentionPopup();
        wysiwygEl.focus();

        // DOM insert (not execCommand) so we can place the caret immediately after the
        // contenteditable=false mention. Browsers otherwise park it at the end of the block.
        range.deleteContents();
        const template = document.createElement('template');
        template.innerHTML = html;
        const mentionNode = template.content.firstElementChild;
        if (!mentionNode) return;
        range.insertNode(mentionNode);
        // Don't keep bold/italic/code wrappers around the mention.
        liftOutOfInlineFormatting(mentionNode, wysiwygEl);

        // Zero-width space gives the caret a text node to sit in after the atomic mention.
        const zwsp = document.createTextNode('\u200B');
        mentionNode.after(zwsp);
        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStart(zwsp, 1);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);

        handleWysiwygInput();
        finishWysiwygHistoryEntry(historyBefore);
    }

    function selectMentionByIndex(index: number) {
        if (mentionFilteredFiles.length === 0) return;
        const file = mentionFilteredFiles[index];
        if (file) insertFileMention(file);
    }

    function applyWysiwygCommand(command: string, value?: string) {
        if (!wysiwygEl) return;
        runWysiwygHistoryTransaction(() => {
            wysiwygEl?.focus();
            document.execCommand(command, false, value);
            handleWysiwygInput();
        });
    }

    function isFileMentionEl(node: Node | null | undefined): node is HTMLElement {
        return !!node && node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList?.contains(FILE_MENTION_CLASS);
    }

    function removeFileMention(mention: HTMLElement) {
        if (!wysiwygEl) return;
        const historyBefore = captureWysiwygHistoryState();
        // Drop caret-anchor ZWSPs next to the mention
        const prev = mention.previousSibling;
        const next = mention.nextSibling;
        if (isZwspOnlyText(prev)) prev?.parentNode?.removeChild(prev);
        if (isZwspOnlyText(next)) next?.parentNode?.removeChild(next);

        const parent = mention.parentNode;
        const anchor = document.createTextNode('\u200B');
        parent?.insertBefore(anchor, mention);
        mention.remove();

        const selection = window.getSelection();
        const caret = document.createRange();
        caret.setStart(anchor, 0);
        caret.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(caret);
        handleWysiwygInput();
        finishWysiwygHistoryEntry(historyBefore);
    }

    // Mention immediately before a collapsed caret (skipping ZWSP anchors).
    function fileMentionBeforeCaret(): HTMLElement | null {
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0 || !wysiwygEl) return null;
        const range = selection.getRangeAt(0);
        if (!wysiwygEl.contains(range.startContainer)) return null;

        const node = range.startContainer;
        const offset = range.startOffset;

        if (node.nodeType === Node.TEXT_NODE) {
            const before = (node.textContent || '').slice(0, offset);
            // Real characters before the caret → not adjacent to a mention
            if (before.replace(/\u200B/g, '').length > 0) return null;
            let prev: Node | null = offset === 0 || /^[\u200B]*$/.test(before) ? node.previousSibling : null;
            // Caret inside a ZWSP-only text node after a mention
            if (!prev && /^[\u200B]*$/.test(before)) prev = node.previousSibling;
            while (prev && isZwspOnlyText(prev)) prev = prev.previousSibling;
            if (isFileMentionEl(prev)) return prev;
            return null;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            let i = offset - 1;
            while (i >= 0) {
                const child = node.childNodes[i];
                if (isZwspOnlyText(child)) { i--; continue; }
                if (isFileMentionEl(child)) return child;
                break;
            }
        }
        return null;
    }

    // Mention immediately after a collapsed caret (skipping ZWSP anchors).
    function fileMentionAfterCaret(): HTMLElement | null {
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0 || !wysiwygEl) return null;
        const range = selection.getRangeAt(0);
        if (!wysiwygEl.contains(range.startContainer)) return null;

        const node = range.startContainer;
        const offset = range.startOffset;

        if (node.nodeType === Node.TEXT_NODE) {
            const after = (node.textContent || '').slice(offset);
            if (after.replace(/\u200B/g, '').length > 0) return null;
            let next: Node | null = node.nextSibling;
            while (next && isZwspOnlyText(next)) next = next.nextSibling;
            if (isFileMentionEl(next)) return next;
            return null;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            let i = offset;
            while (i < node.childNodes.length) {
                const child = node.childNodes[i];
                if (isZwspOnlyText(child)) { i++; continue; }
                if (isFileMentionEl(child)) return child;
                break;
            }
        }
        return null;
    }

    // Keyboard shortcuts while editing the WYSIWYG area: Ctrl/Cmd+B bold,
    // Ctrl/Cmd+I italic, Ctrl/Cmd+Shift+X strikethrough, Ctrl/Cmd+E inline
    // code, Ctrl/Cmd+K insert link. Also navigates the @-mention popup and
    // deletes file mentions atomically on Backspace/Delete.
    function handleWysiwygKeydown(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && !e.altKey) {
            const historyKey = e.key.toLowerCase();
            if (!e.shiftKey && historyKey === 'z') {
                e.preventDefault();
                undoWysiwygHistory();
                return;
            }
            if ((e.shiftKey && historyKey === 'z') || (!e.shiftKey && historyKey === 'y')) {
                e.preventDefault();
                redoWysiwygHistory();
                return;
            }
            if (!e.shiftKey && historyKey === 'f') {
                e.preventDefault();
                e.stopPropagation();
                openWysiwygFind();
                return;
            }
        }
        if (wysiwygFindOpen && e.key === 'Escape') {
            e.preventDefault();
            closeWysiwygFind();
            return;
        }
        if (showMentionPopup) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (mentionFilteredFiles.length === 0) return;
                mentionSelectedIndex = (mentionSelectedIndex + 1) % mentionFilteredFiles.length;
                scrollSelectedMentionIntoView();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (mentionFilteredFiles.length === 0) return;
                mentionSelectedIndex = (mentionSelectedIndex - 1 + mentionFilteredFiles.length) % mentionFilteredFiles.length;
                scrollSelectedMentionIntoView();
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                if (mentionFilteredFiles.length > 0) {
                    e.preventDefault();
                    selectMentionByIndex(mentionSelectedIndex);
                    return;
                }
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closeMentionPopup();
                return;
            }
        }

        // Tab/Shift+Tab indents/outdents list items (including checklists).
        if (e.key === 'Tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const historyBefore = captureWysiwygHistoryState();
            if (handleWysiwygTab(e)) {
                e.preventDefault();
                finishWysiwygHistoryEntry(historyBefore);
                return;
            }
        }

        // Checklist: Enter continues with a new checkbox; empty item breaks out.
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const taskItem = getListItemFromSelection();
            if (taskItem && isTaskListItem(taskItem)) {
                const historyBefore = captureWysiwygHistoryState();
                e.preventDefault();
                if (handleTaskListEnter(taskItem)) {
                    handleWysiwygInput();
                    finishWysiwygHistoryEntry(historyBefore);
                }
                return;
            }
        }

        // Code block: Enter inserts a new line inside the block (staying in
        // it); Enter on an empty last line exits the block (an empty line in
        // the middle just adds a new line).
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const pre = getPreFromSelection();
            if (!pre) return;
            const historyBefore = captureWysiwygHistoryState();
            e.preventDefault();
            const selection = window.getSelection();
            const line = selection && selection.isCollapsed ? emptyLineInPre(pre) : null;
            if (line && line.end === line.total) {
                escapeWysiwygCodeBlock(pre, line);
            } else {
                insertNewlineInPre();
            }
            handleWysiwygInput();
            finishWysiwygHistoryEntry(historyBefore);
        }

        // Backspace at the start of a task item removes the checkbox.
        if (e.key === 'Backspace' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const historyBefore = captureWysiwygHistoryState();
            if (handleTaskListBackspace()) {
                e.preventDefault();
                finishWysiwygHistoryEntry(historyBefore);
                return;
            }
            if (handlePlainItemBackspaceIntoTask()) {
                e.preventDefault();
                finishWysiwygHistoryEntry(historyBefore);
                return;
            }
        }

        // Delete at a task-list boundary: merge manually so the browser never
        // rebuilds the <li> (which drops the checkbox inputs).
        if (e.key === 'Delete' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
            const historyBefore = captureWysiwygHistoryState();
            if (handleTaskBoundaryDelete()) {
                e.preventDefault();
                finishWysiwygHistoryEntry(historyBefore);
                return;
            }
        }

        // One Backspace/Delete removes the whole mention (not just the ZWSP caret anchor,
        // and not the browser's intermediate "select the atom" step).
        if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && (e.key === 'Backspace' || e.key === 'Delete')) {
            const selection = window.getSelection();
            // Browser may already have selected the atomic mention
            if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const frag = range.cloneContents();
                const nodes = Array.from(frag.childNodes).filter(
                    (n) => !(n.nodeType === Node.TEXT_NODE && /^[\u200B]*$/.test(n.textContent || ''))
                );
                if (nodes.length === 1 && isFileMentionEl(nodes[0])) {
                    // Resolve the live node from the selection range
                    let live: HTMLElement | null = null;
                    if (isFileMentionEl(range.startContainer)) {
                        live = range.startContainer;
                    } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
                        for (let i = range.startOffset; i < range.startContainer.childNodes.length; i++) {
                            const c = range.startContainer.childNodes[i];
                            if (isZwspOnlyText(c)) continue;
                            if (isFileMentionEl(c)) { live = c; break; }
                            break;
                        }
                    }
                    if (!live) {
                        live = (range.commonAncestorContainer as Element).closest?.(`.${FILE_MENTION_CLASS}`) as HTMLElement | null;
                    }
                    if (live && wysiwygEl?.contains(live)) {
                        e.preventDefault();
                        removeFileMention(live);
                        return;
                    }
                }
            }

            const mention = e.key === 'Backspace' ? fileMentionBeforeCaret() : fileMentionAfterCaret();
            if (mention) {
                e.preventDefault();
                removeFileMention(mention);
                return;
            }
        }

        if (!e.metaKey && !e.ctrlKey) return;
        const key = e.key.toLowerCase();
        if (key === 'a' && !e.shiftKey && !e.altKey) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            const pre = getPreFromSelection();
            if (!pre) return;
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            const end = selection.getRangeAt(0).endContainer;
            if (end !== pre && !pre.contains(end)) return;
            e.preventDefault();
            selectAllInWysiwygCodeBlock(pre);
            return;
        }
        if (key === 'b' && !e.shiftKey && !e.altKey) {
            const selection = window.getSelection();
            const hasTextSelection =
                !!selection &&
                !selection.isCollapsed &&
                selection.rangeCount > 0 &&
                !!wysiwygEl &&
                !!selection.anchorNode &&
                !!selection.focusNode &&
                wysiwygEl.contains(selection.anchorNode) &&
                wysiwygEl.contains(selection.focusNode) &&
                selection.toString().replace(/\u200B/g, '').trim().length > 0;
            if (!hasTextSelection) {
                // No text selected inside the WYSIWYG editor — let the global
                // Cmd/Ctrl+B handler toggle the sidebar instead of applying bold.
                return;
            }
            e.preventDefault();
            applyWysiwygCommand('bold');
        } else if (key === 'i' && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            applyWysiwygCommand('italic');
        } else if (key === 'x' && e.shiftKey && !e.altKey) {
            e.preventDefault();
            applyWysiwygCommand('strikeThrough');
        } else if (key === 'e' && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            runWysiwygHistoryTransaction(() => toggleInlineCode());
        } else if (key === 'k' && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            openLinkInput();
        }
    }

    // Toolbar buttons run on mousedown (preventDefault) so the text selection
    // inside the editable area is preserved.
    function handleToolbarMouseDown(event: MouseEvent) {
        const btn = (event.target as HTMLElement).closest('button[data-command]') as HTMLButtonElement | null;
        if (!btn) return;
        event.preventDefault();
        const command = btn.dataset.command!;
        if (command === 'link') {
            openLinkInput();
            return;
        }
        if (command === 'inlineCode') {
            runWysiwygHistoryTransaction(() => toggleInlineCode());
            return;
        }
        if (command === 'insertHorizontalRule') {
            runWysiwygHistoryTransaction(() => {
                if (insertWysiwygHorizontalRule()) handleWysiwygInput();
            });
            return;
        }
        if (command === 'insertTaskList') {
            runWysiwygHistoryTransaction(() => insertOrToggleTaskList());
            return;
        }
        if (command === 'codeBlock') {
            runWysiwygHistoryTransaction(() => toggleCodeBlock());
            return;
        }
        applyWysiwygCommand(command, btn.dataset.value);
    }

    // Keyboard-triggered clicks (Enter/Space) have detail === 0 and don't fire mousedown
    function handleToolbarClick(event: MouseEvent) {
        if (event.detail !== 0) return;
        const btn = (event.target as HTMLElement).closest('button[data-command]') as HTMLButtonElement | null;
        if (!btn) return;
        const command = btn.dataset.command!;
        if (command === 'link') {
            openLinkInput();
            return;
        }
        if (command === 'inlineCode') {
            runWysiwygHistoryTransaction(() => toggleInlineCode());
            return;
        }
        if (command === 'insertHorizontalRule') {
            runWysiwygHistoryTransaction(() => {
                if (insertWysiwygHorizontalRule()) handleWysiwygInput();
            });
            return;
        }
        if (command === 'insertTaskList') {
            runWysiwygHistoryTransaction(() => insertOrToggleTaskList());
            return;
        }
        if (command === 'codeBlock') {
            runWysiwygHistoryTransaction(() => toggleCodeBlock());
            return;
        }
        applyWysiwygCommand(command, btn.dataset.value);
    }

    function openLinkInput() {
        if (!wysiwygEl) return;
        savedLinkHistoryBefore = captureWysiwygHistoryState();
        const selection = window.getSelection();
        savedLinkRange = selection && selection.rangeCount > 0 && wysiwygEl.contains(selection.anchorNode)
            ? selection.getRangeAt(0).cloneRange()
            : null;
        showLinkInput = true;
        tick().then(() => linkInputEl?.focus());
    }

    function applyLink() {
        const url = linkUrl.trim();
        if (url && wysiwygEl) {
            runWysiwygHistoryTransaction(() => {
                wysiwygEl?.focus();
                if (savedLinkRange) {
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(savedLinkRange);
                }
                const href = isUrlLike(url) ? normalizeUrl(url) : url;
                const selection = window.getSelection();
                const hasSelection = !!selection && !selection.isCollapsed;
                if (hasSelection) {
                    document.execCommand('createLink', false, href);
                } else {
                    document.execCommand('insertHTML', false, linkHtml(href, url));
                }
                ensureWysiwygLinksOpenInNewTab();
                handleWysiwygInput();
            }, savedLinkHistoryBefore);
        }
        showLinkInput = false;
        linkUrl = '';
        savedLinkRange = null;
        savedLinkHistoryBefore = null;
    }

    function exitPreviewEditMode() {
        if (previewEditMode) {
            commitWysiwygEdits();
            resetWysiwygHistory();
        }
        clearWysiwygFindHighlights();
        wysiwygFindOpen = false;
        previewEditMode = false;
        wysiwygSourceFileId = null;
        showLinkInput = false;
        savedLinkRange = null;
        savedLinkHistoryBefore = null;
        closeMentionPopup();
    }

    async function applyPreferredVisualMode() {
        if (lastMarkdownMode === 'preview') {
            exitPreviewEditMode();
        } else {
            await enterPreviewEditMode();
        }
    }


    $: previewHtml = activeTab?.type === 'preview'
        ? renderMarkdown(sourceContent, {
            imageThumbnails: true,
            resolveFileLanguage: (fileId) => tabLanguages[fileId] ?? getLanguageForTab(fileId)
        })
        : '';
    let previewEl: HTMLDivElement | null = null;
    $: if (previewHtml) tick().then(() => { if (previewEl) resolvePastedImages(previewEl); });

    export function flush() { commitWysiwygEdits(); }
    export function resetHistory() { resetWysiwygHistory(); }
    export function enterEditMode(force = false) { return enterPreviewEditMode(force); }
    export function exitEditMode() { exitPreviewEditMode(); }
    export function openFind() { openWysiwygFind(); }
    export function dismiss() { closeLightbox(); closeMentionPopup(); }
    export function handleDocumentClick(event: MouseEvent) {
        if (!showMentionPopup) return;
        const target = event.target as HTMLElement;
        if (!target.closest('.mention-popup') && !wysiwygEl?.contains(target)) closeMentionPopup();
    }
    export function refreshFromStore(sourceFileId: string | undefined) {
        if (!previewEditMode || wysiwygSourceFileId !== sourceFileId) return;
        if (wysiwygDebounce) { clearTimeout(wysiwygDebounce); wysiwygDebounce = null; }
        renderWysiwygFromStore();
    }
    onDestroy(() => {
        if (!browser) return;
        commitWysiwygEdits();
        resetWysiwygHistory();
        if (wysiwygDebounce) clearTimeout(wysiwygDebounce);
    });
</script>

{#if visible && activeTab?.type === 'preview'}
                {#if previewEditMode}
                    <div class="wysiwyg-container">
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div class="wysiwyg-toolbar" on:mousedown={handleToolbarMouseDown} on:click={handleToolbarClick}>
                            <Tooltip text={isMac ? "Cmd+B" : "Ctrl+B"} pos="right">
                                <button type="button" data-command="bold" aria-label="Bold">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
                                </button>
                            </Tooltip>
                            <Tooltip text={isMac ? "Cmd+I" : "Ctrl+I"} pos="bottom">
                                <button type="button" data-command="italic" aria-label="Italic">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
                                </button>
                            </Tooltip>
                            <Tooltip text={isMac ? "Cmd+Shift+X" : "Ctrl+Shift+X"} pos="bottom">
                                <button type="button" data-command="strikeThrough" aria-label="Strikethrough">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>
                                </button>
                            </Tooltip>
                            <span class="wysiwyg-separator"></span>
                            <button type="button" data-command="formatBlock" data-value="h1" title="Heading 1" aria-label="Heading 1"><span class="wysiwyg-text-btn">H1</span></button>
                            <button type="button" data-command="formatBlock" data-value="h2" title="Heading 2" aria-label="Heading 2"><span class="wysiwyg-text-btn">H2</span></button>
                            <button type="button" data-command="formatBlock" data-value="h3" title="Heading 3" aria-label="Heading 3"><span class="wysiwyg-text-btn">H3</span></button>
                            <span class="wysiwyg-separator"></span>
                            <button type="button" data-command="insertUnorderedList" title="Bulleted list" aria-label="Bulleted list">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                            </button>
                            <button type="button" data-command="insertOrderedList" title="Numbered list" aria-label="Numbered list">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                            </button>
                            <button type="button" data-command="insertTaskList" title="Checklist" aria-label="Checklist">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m4 8 1.5 1.5L9 6"/><line x1="13" y1="8" x2="21" y2="8"/><rect x="3" y="13" width="6" height="6" rx="1"/><line x1="13" y1="16" x2="21" y2="16"/></svg>
                            </button>
                            <button type="button" data-command="formatBlock" data-value="blockquote" title="Quote" aria-label="Quote">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
                            </button>
                            <button type="button" data-command="codeBlock" title="Code block" aria-label="Code block">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                            </button>
                            <Tooltip text={isMac ? "Cmd+E" : "Ctrl+E"} pos="bottom">
                                <button type="button" data-command="inlineCode" aria-label="Inline code">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>
                                </button>
                            </Tooltip>
                            <button type="button" data-command="insertHorizontalRule" title="Horizontal rule" aria-label="Horizontal rule">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="12" x2="20" y2="12"/></svg>
                            </button>
                            <span class="wysiwyg-separator"></span>
                            <Tooltip text={isMac ? "Cmd+K" : "Ctrl+K"} pos="bottom">
                                <button type="button" data-command="link" aria-label="Insert link">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                </button>
                            </Tooltip>
                            <button type="button" data-command="removeFormat" title="Clear formatting" aria-label="Clear formatting">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                            </button>
                            {#if showLinkInput}
                                <input
                                    class="wysiwyg-link-input"
                                    type="text"
                                    placeholder="https://example.com"
                                    aria-label="Link URL"
                                    bind:value={linkUrl}
                                    bind:this={linkInputEl}
                                    on:keydown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                                        else if (e.key === 'Escape') { e.preventDefault(); showLinkInput = false; linkUrl = ''; savedLinkRange = null; savedLinkHistoryBefore = null; }
                                    }}
                                />
                            {/if}
                        </div>
                        {#if wysiwygFindOpen}
                            <div class="wysiwyg-find-bar" role="search" aria-label="Find in document">
                                <div class="wysiwyg-find-input-wrap">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                                    <input
                                        class="wysiwyg-find-input"
                                        type="text"
                                        placeholder="Find"
                                        aria-label="Find"
                                        value={wysiwygFindQuery}
                                        bind:this={wysiwygFindInputEl}
                                        on:input={(e) => { wysiwygFindQuery = (e.currentTarget as HTMLInputElement).value; updateWysiwygFindHighlights(); }}
                                        on:keydown={handleWysiwygFindInputKeydown}
                                    />
                                    {#if wysiwygFindQuery}
                                        <span class="wysiwyg-find-count">
                                            {#if wysiwygFindMatches.length === 0}
                                                No results
                                            {:else}
                                                {wysiwygFindActiveIndex + 1} of {wysiwygFindMatches.length}
                                            {/if}
                                        </span>
                                    {/if}
                                </div>
                                <div class="wysiwyg-find-actions">
                                    <button
                                        type="button"
                                        class="wysiwyg-find-toggle {wysiwygFindCaseSensitive ? 'active' : ''}"
                                        title="Match Case"
                                        aria-label="Match Case"
                                        aria-pressed={wysiwygFindCaseSensitive}
                                        on:click={() => { wysiwygFindCaseSensitive = !wysiwygFindCaseSensitive; updateWysiwygFindHighlights(); wysiwygFindInputEl?.focus(); }}
                                    >Aa</button>
                                    <button
                                        type="button"
                                        class="wysiwyg-find-toggle {wysiwygFindWholeWord ? 'active' : ''}"
                                        title="Match Whole Word"
                                        aria-label="Match Whole Word"
                                        aria-pressed={wysiwygFindWholeWord}
                                        on:click={() => { wysiwygFindWholeWord = !wysiwygFindWholeWord; updateWysiwygFindHighlights(); wysiwygFindInputEl?.focus(); }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="1"/><path d="M8 9h8M8 13h5M8 17h8"/></svg>
                                    </button>
                                    <button
                                        type="button"
                                        class="wysiwyg-find-toggle {wysiwygFindRegex ? 'active' : ''}"
                                        title="Use Regular Expression"
                                        aria-label="Use Regular Expression"
                                        aria-pressed={wysiwygFindRegex}
                                        on:click={() => { wysiwygFindRegex = !wysiwygFindRegex; updateWysiwygFindHighlights(); wysiwygFindInputEl?.focus(); }}
                                    >.*</button>
                                </div>
                                <div class="wysiwyg-find-nav">
                                    <button
                                        type="button"
                                        class="wysiwyg-find-nav-btn"
                                        title="Previous Match (Shift+Enter)"
                                        aria-label="Previous Match"
                                        on:click={() => nextWysiwygFindMatch(-1)}
                                        disabled={wysiwygFindMatches.length === 0}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>
                                    </button>
                                    <button
                                        type="button"
                                        class="wysiwyg-find-nav-btn"
                                        title="Next Match (Enter)"
                                        aria-label="Next Match"
                                        on:click={() => nextWysiwygFindMatch(1)}
                                        disabled={wysiwygFindMatches.length === 0}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    class="wysiwyg-find-close"
                                    title="Close (Esc)"
                                    aria-label="Close"
                                    on:click={closeWysiwygFind}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </div>
                        {/if}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            class="markdown-preview markdown-body wysiwyg-editing"
                            style="font-size: {fontSize}px;"
                            contenteditable="true"
                            role="textbox"
                            aria-multiline="true"
                            aria-label="Markdown editor (WYSIWYG)"
                            tabindex="0"
                            bind:this={wysiwygEl}
                            on:beforeinput={handleWysiwygBeforeInput}
                            on:input={handleWysiwygInput}
                            on:keydown={handleWysiwygKeydown}
                            on:paste={handleWysiwygPaste}
                            on:click={handleWysiwygClick}
                            on:change={handleWysiwygChange}
                            on:blur={handleWysiwygBlur}
                        ></div>
                        <datalist id={CODE_LANGUAGE_DATALIST_ID}>
                            {#each CODE_LANGUAGE_OPTIONS as option}
                                <option value={option.value} label={option.label}></option>
                            {/each}
                        </datalist>
                    </div>
                {:else}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="markdown-preview markdown-body" bind:this={previewEl} on:click={handlePreviewClick}>
                        {@html previewHtml}
                    </div>
                {/if}

                {#if activeLangPicker}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="lang-picker-backdrop" on:click={closeLangPicker}></div>
                    <div
                        class="lang-picker-popover"
                        style="position: fixed; top: {activeLangPicker.rect.bottom + 4}px; left: {Math.max(8, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1000) - 230, activeLangPicker.rect.right - 220))}px;"
                        role="dialog"
                        aria-label="Select code block language"
                    >
                        <div class="lang-picker-search">
                            <input
                                type="text"
                                class="lang-search-input"
                                placeholder="Search for a language..."
                                bind:value={langSearchQuery}
                                bind:this={langSearchInputEl}
                                on:keydown={handleLangSearchKeyDown}
                                on:input={(e) => {
                                    const q = (e.target as HTMLInputElement).value;
                                    if (!q.trim()) {
                                        const normalized = normalizeCodeLanguage(activeLangPicker?.currentLang ?? '');
                                        const fallback = CODE_LANGUAGE_OPTIONS.findIndex((opt) => normalizeCodeLanguage(opt.value) === normalized);
                                        langSelectedIndex = fallback >= 0 ? fallback : 0;
                                    } else {
                                        langSelectedIndex = 0;
                                    }
                                    scrollLangSelectedIntoView();
                                }}
                                aria-autocomplete="list"
                                aria-controls="lang-picker-list"
                                aria-activedescendant={filteredLanguages[langSelectedIndex] ? `lang-option-${filteredLanguages[langSelectedIndex].value}` : undefined}
                            />
                        </div>
                        <div class="lang-picker-list" bind:this={langPickerListEl} id="lang-picker-list" role="listbox">
                            {#each filteredLanguages as option, i}
                                <button
                                    type="button"
                                    id={`lang-option-${option.value}`}
                                    role="option"
                                    aria-selected={i === langSelectedIndex}
                                    class="lang-picker-option {normalizeCodeLanguage(option.value) === normalizeCodeLanguage(activeLangPicker.currentLang) ? 'selected' : ''} {i === langSelectedIndex ? 'focused' : ''}"
                                    on:click={() => selectCodeLanguage(option.value)}
                                    on:mouseenter={() => langSelectedIndex = i}
                                >
                                    <span class="lang-option-label">{option.label}</span>
                                    {#if normalizeCodeLanguage(option.value) === normalizeCodeLanguage(activeLangPicker.currentLang)}
                                        <svg class="lang-check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    {/if}
                                </button>
                            {/each}
                            {#if filteredLanguages.length === 0 && langSearchQuery.trim()}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected="true"
                                    class="lang-picker-option custom-lang {langSelectedIndex === 0 ? 'focused' : ''}"
                                    on:click={() => selectCodeLanguage(langSearchQuery.trim())}
                                    on:mouseenter={() => langSelectedIndex = 0}
                                >
                                    <span class="lang-option-label">Use "{langSearchQuery.trim()}"</span>
                                </button>
                            {/if}
                        </div>
                    </div>
                {/if}
{/if}

    {#if lightboxSrc}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="image-lightbox" role="dialog" aria-modal="true" aria-label="Full-size image" tabindex="-1" on:click={closeLightbox}>
            <button type="button" class="lightbox-close" title="Close (Esc)" aria-label="Close image viewer" on:click|stopPropagation={closeLightbox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <img src={lightboxSrc} alt="Full-size" on:click|stopPropagation={() => {}} />
        </div>
    {/if}


    {#if showMentionPopup}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="mention-popup" style={mentionPopupStyle} on:mousedown|preventDefault>
            <div class="mention-popup-header">Search files by name...</div>
            <div class="mention-results" bind:this={mentionResultsEl}>
                {#each mentionFilteredFiles as file, i}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        class="mention-result-item {i === mentionSelectedIndex ? 'selected' : ''}"
                        on:click={() => insertFileMention(file)}
                        on:mouseenter={() => mentionSelectedIndex = i}
                    >
                        <span class="search-file-info">
                            {#if file.type === 'whiteboard'}
                                <WhiteboardIcon name="whiteboard" size={17} />
                            {:else if file.type === 'preview'}
                                <LanguageIcon language="markdown" size={17} />
                            {:else}
                                <LanguageIcon language={tabLanguages[file.fileId] ?? language} size={17} />
                            {/if}
                            <span class="search-file-name">{file.fileName}</span>
                        </span>
                        <span class="search-file-meta">
                            {#if getFilePath(file.fileId) !== '/'}
                                <span class="search-file-path">{getFilePath(file.fileId).replace(/^\/|\/$/g, '')}</span>
                            {/if}
                        </span>
                    </div>
                {/each}
                {#if mentionFilteredFiles.length === 0}
                    <div class="search-no-results">No matching files</div>
                {/if}
            </div>
        </div>
    {/if}

<style>
    .markdown-preview {
        flex-grow: 1;
        min-height: 0;
        overflow-y: auto;
        padding: var(--spacing-4);
        width: 100%;
        text-align: left;
    }

    .markdown-preview :global(img) {
        max-width: 100%;
        box-sizing: content-box;
    }

    .markdown-preview :global(a) {
        color: var(--color-highlight);
        text-decoration: none;
    }

    .markdown-preview :global(a:hover) {
        text-decoration: underline;
    }

    /* WYSIWYG editing */
    .wysiwyg-container {
        flex-grow: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    .wysiwyg-toolbar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 2px;
        padding: var(--spacing-1) var(--spacing-2);
        border-bottom: 1px solid var(--color-border);
        flex-shrink: 0;
    }

    .wysiwyg-toolbar button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 26px;
        height: 26px;
        padding: 0 4px;
        border-radius: 6px;
        background: transparent;
        color: var(--color-text-secondary);
        border: 1px solid transparent;
        cursor: pointer;
    }

    .wysiwyg-toolbar button:hover {
        background: var(--color-bg-tertiary, rgba(128, 128, 128, 0.15));
        color: var(--color-text);
    }

    .wysiwyg-text-btn {
        font-size: 0.72rem;
        font-weight: 700;
        font-family: inherit;
    }

    .wysiwyg-separator {
        width: 1px;
        height: 16px;
        background: var(--color-border);
        margin: 0 4px;
    }

    .wysiwyg-link-input {
        margin-left: var(--spacing-1);
        padding: 2px 8px;
        font-size: 0.8rem;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: var(--color-bg);
        color: var(--color-text);
        min-width: 200px;
    }

    .wysiwyg-link-input:focus {
        outline: 1px solid var(--color-highlight);
        border-color: var(--color-highlight);
    }

    .wysiwyg-editing {
        outline: none;
        cursor: text;
    }

    .wysiwyg-editing :global(a) {
        cursor: pointer;
    }

    .wysiwyg-editing:focus {
        box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-highlight) 40%, transparent);
        border-radius: var(--border-radius-md);
    }

    /* WYSIWYG find in document */
    .wysiwyg-find-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        background: var(--color-bg);
        border-bottom: 1px solid var(--color-border);
        flex-shrink: 0;
    }

    .wysiwyg-find-input-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        padding: 4px 8px;
    }

    .wysiwyg-find-input-wrap:focus-within {
        border-color: var(--color-highlight);
    }

    .wysiwyg-find-input {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: var(--color-text);
        font-size: 0.85rem;
        font-family: inherit;
    }

    .wysiwyg-find-count {
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        flex-shrink: 0;
    }

    .wysiwyg-find-actions {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .wysiwyg-find-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 4px;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: var(--color-text-secondary);
        font-size: 0.7rem;
        font-family: var(--font-mono, monospace);
        cursor: pointer;
    }

    .wysiwyg-find-toggle:hover {
        background: var(--color-second-bg);
        color: var(--color-text);
    }

    .wysiwyg-find-toggle.active {
        background: rgba(var(--color-highlight-rgb, 59, 130, 246), 0.3);
        border-color: var(--color-highlight);
        color: var(--color-text);
    }

    .wysiwyg-find-nav {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .wysiwyg-find-nav-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--color-surface);
        color: var(--color-text-secondary);
        cursor: pointer;
    }

    .wysiwyg-find-nav-btn:hover:not(:disabled) {
        background: var(--color-second-bg);
        color: var(--color-text);
    }

    .wysiwyg-find-nav-btn:disabled {
        opacity: 0.4;
        cursor: default;
    }

    .wysiwyg-find-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--color-text-secondary);
        cursor: pointer;
    }

    .wysiwyg-find-close:hover {
        background: var(--color-second-bg);
        color: var(--color-text);
    }

    :global(::highlight(wysiwyg-find)) {
        background-color: rgba(234, 179, 8, 0.4);
    }

    :global(::highlight(wysiwyg-find-active)) {
        background-color: rgba(234, 179, 8, 0.85);
    }

    :global(.wysiwyg-find-match) {
        background: rgba(234, 179, 8, 0.4);
        border-radius: 2px;
    }

    :global(.wysiwyg-find-match.wysiwyg-find-active) {
        background: rgba(234, 179, 8, 0.85);
        outline: 1px solid #eab308;
    }


    /* Image lightbox (full-size view) */
    .image-lightbox {
        position: fixed;
        inset: 0;
        z-index: 4000;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        cursor: zoom-out;
    }

    .image-lightbox img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: var(--border-radius-md);
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
        cursor: default;
    }

    .lightbox-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        cursor: pointer;
    }

    .lightbox-close:hover {
        background: rgba(255, 255, 255, 0.25);
    }

    /* @-mention file picker (WYSIWYG) */
    .mention-popup {
        position: fixed;
        z-index: 1100;
        width: 320px;
        max-width: calc(100vw - 16px);
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: 6px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
        overflow: hidden;
    }

    .mention-popup-header {
        padding: 8px 12px;
        font-size: 0.75rem;
        color: var(--color-text-secondary);
        border-bottom: 1px solid var(--color-border);
    }

    .mention-results {
        max-height: 240px;
        overflow-y: auto;
    }

    .mention-result-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: pointer;
        color: var(--color-text-secondary);
    }

    .mention-result-item.selected {
        background: var(--color-highlight);
        color: var(--color-text);
    }

    .search-file-info {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
    }

    .search-file-name {
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .search-file-meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        margin-left: 12px;
    }

    .search-file-path {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        white-space: nowrap;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        opacity: 0.85;
    }

    .search-no-results {
        padding: 16px;
        text-align: center;
        color: var(--color-text-secondary);
    }

</style>

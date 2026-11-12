// Selection and code-block DOM operations, independent of page state.
import { CODE_COPY_WRAPPER_CLASS, CODE_LANGUAGE_INPUT_CLASS, INLINE_CODE_STYLE_MARKER, highlightCodeBlocks } from '../utils/markdown';

export function createCodeSelection(
    getRoot: () => HTMLElement | null,
    isApplyingHistory: () => boolean,
    getLanguagePickerWrapper: () => HTMLElement | null
) {
    // The <pre> the caret is inside, if any (within the WYSIWYG editor).
    function getPreFromSelection(): HTMLElement | null {
        const wysiwygEl = getRoot();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !wysiwygEl) return null;
        const range = selection.getRangeAt(0);
        if (!wysiwygEl.contains(range.startContainer)) return null;
        let node: Node | null = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (!node || !(node instanceof HTMLElement)) return null;
        const pre = node.closest('pre');
        return pre && wysiwygEl.contains(pre) ? pre : null;
    }

    function getCaretTextOffset(root: HTMLElement): number | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed || !root.contains(selection.anchorNode)) return null;
        const range = selection.getRangeAt(0).cloneRange();
        const before = document.createRange();
        before.selectNodeContents(root);
        before.setEnd(range.startContainer, range.startOffset);
        return before.toString().length;
    }

    function restoreCaretTextOffset(root: HTMLElement, offset: number) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let remaining = offset;
        let node = walker.nextNode() as Text | null;
        let lastText: Text | null = null;
        while (node) {
            lastText = node;
            const length = node.textContent?.length ?? 0;
            if (remaining <= length) {
                const range = document.createRange();
                range.setStart(node, remaining);
                range.collapse(true);
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                return;
            }
            remaining -= length;
            node = walker.nextNode() as Text | null;
        }

        const range = document.createRange();
        if (lastText) range.setStart(lastText, lastText.length);
        else range.setStart(root, 0);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    function rehighlightWysiwygCodeBlocks() {
        const wysiwygEl = getRoot();
        if (!wysiwygEl) return;
        const activePre = getPreFromSelection();
        const caretOffset = activePre ? getCaretTextOffset(activePre) : null;
        highlightCodeBlocks(wysiwygEl);
        if (activePre?.isConnected && caretOffset !== null) {
            restoreCaretTextOffset(activePre, caretOffset);
        }
    }

    // The char range (in the ZWSP-stripped text) of the line the caret is on
    // inside the pre, when that line is already empty. Returns null otherwise.
    function emptyLineInPre(pre: HTMLElement): { start: number; end: number; total: number } | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const range = selection.getRangeAt(0);
        const prefixRange = document.createRange();
        prefixRange.selectNodeContents(pre);
        prefixRange.setEnd(range.startContainer, range.startOffset);
        const before = prefixRange.toString().replace(/\u200B/g, '');
        const total = (pre.textContent || '').replace(/\u200B/g, '');
        const after = total.slice(before.length);
        const lastNewline = before.lastIndexOf('\n');
        const start = lastNewline === -1 ? 0 : lastNewline + 1;
        const nextNewline = after.indexOf('\n');
        const end = nextNewline === -1 ? total.length : before.length + nextNewline;
        if (total.slice(start, end).trim() !== '') return null;
        return { start, end, total: total.length };
    }

    function selectAllInWysiwygCodeBlock(pre: HTMLElement) {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        const code = pre.firstElementChild?.tagName === 'CODE' ? pre.firstElementChild : pre;
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Enter inside a code block: insert a real newline so the line stays part
    // of the same code block.
    function insertNewlineInPre() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        if (!range.collapsed) range.deleteContents();
        const nl = document.createTextNode('\n');
        range.insertNode(nl);
        range.setStartAfter(nl);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Notion-style exit from a code block: Enter on an empty last line. An
    // empty code block is deleted; a non-empty one stays — with the empty
    // line removed — and the caret moves to a fresh paragraph right after it.
    function escapeWysiwygCodeBlock(pre: HTMLElement, line: { start: number; total: number }) {
        const wrapper = pre.parentElement?.classList.contains(CODE_COPY_WRAPPER_CLASS) ? pre.parentElement : null;
        const block = wrapper ?? pre;
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        const empty = !(pre.textContent || '').replace(/\u200B/g, '').trim();
        if (!empty) {
            // Drop the empty line the caret is on (the '\n' that starts it), so
            // the code block does not keep a phantom empty last line.
            if (line.start > 0) {
                const text = (pre.textContent || '').replace(/\u200B/g, '');
                pre.textContent = text.slice(0, line.start - 1) + text.slice(line.start);
            }
        }
        if (empty || !(pre.textContent || '').replace(/\u200B/g, '').trim()) {
            block.replaceWith(p);
        } else {
            block.after(p);
        }
        const selection = window.getSelection();
        if (selection) {
            const caret = document.createRange();
            caret.selectNodeContents(p);
            caret.collapse(false);
            selection.removeAllRanges();
            selection.addRange(caret);
        }
    }

    // The browser sometimes deletes a code block on its own (e.g. Backspace
    // emptying it and merging into the previous paragraph), leaving the copy
    // button wrapper behind like a widow. Remove orphan wrappers, and empty
    // ones the caret has moved out of.
    function removeOrphanCodeWrappers() {
        const wysiwygEl = getRoot();
        if (!wysiwygEl || isApplyingHistory()) return;
        const selection = window.getSelection();
        const caretNode = selection?.anchorNode ?? null;
        const focusedLanguageInput = document.activeElement instanceof HTMLInputElement &&
            document.activeElement.classList.contains(CODE_LANGUAGE_INPUT_CLASS)
            ? document.activeElement
            : null;
        wysiwygEl.querySelectorAll(`.${CODE_COPY_WRAPPER_CLASS}`).forEach((wrapper) => {
            const pres = wrapper.querySelectorAll('pre');
            if (pres.length === 0) {
                wrapper.remove();
                return;
            }
            if (wrapper === getLanguagePickerWrapper()) return;
            if (focusedLanguageInput && wrapper.contains(focusedLanguageInput)) return;
            if (caretNode && wrapper.contains(caretNode)) return;
            const hasText = Array.from(pres).some((p) => (p.textContent || '').replace(/\u200B/g, '').trim() !== '');
            if (!hasText) wrapper.remove();
        });
    }

    // True when el is an inline code element: a toolbar-wrapped <code> or a
    // marker span created by the backtick auto-close.
    function isInlineCodeElement(el: Element | null): boolean {
        if (!(el instanceof HTMLElement)) return false;
        if (el.tagName === 'CODE') return el.parentElement?.tagName !== 'PRE';
        return (el.getAttribute('style') || '').includes(INLINE_CODE_STYLE_MARKER);
    }

    // Breaks at the end of inline code must start outside its formatting;
    // otherwise the browser clones empty code pills into the following lines.
    function exitInlineCodeAtEnd() {
        const wysiwygEl = getRoot();
        const selection = window.getSelection();
        if (!wysiwygEl || !selection?.isCollapsed || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!wysiwygEl.contains(range.startContainer)) return;
        let ancestor = range.startContainer instanceof Element
            ? range.startContainer : range.startContainer.parentElement;
        if (ancestor?.closest('pre')) return;
        let code: Element | null = null;
        while (ancestor && ancestor !== wysiwygEl) {
            if (isInlineCodeElement(ancestor)) code = ancestor;
            ancestor = ancestor.parentElement;
        }
        if (!code) return;
        const remaining = range.cloneRange();
        remaining.setEnd(code, code.childNodes.length);
        if (remaining.toString().replace(/\u200B/g, '') !== '') return;

        // A caret immediately after an inline element still inherits its style
        // in Chrome. Place it after a plain-text anchor instead, as auto-close does.
        const anchor = document.createTextNode('\u200B');
        code.after(anchor);
        range.setStart(anchor, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }


    return {
        getPreFromSelection,
        rehighlightWysiwygCodeBlocks,
        emptyLineInPre,
        selectAllInWysiwygCodeBlock,
        insertNewlineInPre,
        escapeWysiwygCodeBlock,
        removeOrphanCodeWrappers,
        isInlineCodeElement,
        exitInlineCodeAtEnd,
    };
}

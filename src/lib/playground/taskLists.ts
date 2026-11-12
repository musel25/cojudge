// Task-list editing preserves checkbox nodes during browser DOM operations.
import { prepareTaskListCheckboxes, isTaskListItem, isEmptyTaskListItem, createTaskCheckbox, ensureTaskCheckbox, ensureTaskItemCaretAnchor, removeTaskCheckbox } from '../utils/markdown';

export function isZwspOnlyText(node: Node | null | undefined): boolean {
    return !!node && node.nodeType === Node.TEXT_NODE && /^[\u200B]*$/.test(node.textContent || '');
}

export function createTaskListEditor(getRoot: () => HTMLElement | null, onInput: () => void) {
    function getListItemFromSelection(): HTMLLIElement | null {
        const wysiwygEl = getRoot();
        if (!wysiwygEl) return null;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        let node: Node | null = selection.getRangeAt(0).startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        while (node && node !== wysiwygEl) {
            if (node instanceof HTMLLIElement) return node;
            node = node.parentElement;
        }
        return null;
    }

    function placeCaretInTaskItem(li: HTMLElement, atStart = true) {
        const wysiwygEl = getRoot();
        const selection = window.getSelection();
        if (!selection) return;
        wysiwygEl?.focus();
        const anchor = ensureTaskItemCaretAnchor(li);
        const range = document.createRange();
        if (atStart && anchor) {
            // Offset 1 sits after the ZWSP, so the caret paints to the right of
            // the checkbox instead of the left (browser default for <input>).
            range.setStart(anchor, Math.min(1, anchor.length));
            range.collapse(true);
        } else if (!atStart) {
            range.selectNodeContents(li);
            range.collapse(false);
        } else {
            range.selectNodeContents(li);
            range.collapse(false);
        }
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function breakOutOfListItem(li: HTMLLIElement) {
        const list = li.parentElement;
        if (!list || !/^(UL|OL)$/.test(list.tagName)) return;
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        const hasPrev = !!li.previousElementSibling;
        const hasNext = !!li.nextElementSibling;
        let nodeAfter = li.nextSibling;
        li.remove();
        if (!hasPrev && !hasNext) {
            list.replaceWith(p);
        } else if (!hasNext) {
            list.after(p);
        } else if (!hasPrev) {
            list.before(p);
        } else {
            const newList = document.createElement(list.tagName);
            while (nodeAfter) {
                const nextNode = nodeAfter.nextSibling;
                newList.appendChild(nodeAfter);
                nodeAfter = nextNode;
            }
            list.after(p);
            p.after(newList);
        }
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    // Enter in a checklist item continues the checklist; empty item breaks out.
    function handleTaskListEnter(li: HTMLLIElement): boolean {
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;

        if (isEmptyTaskListItem(li)) {
            breakOutOfListItem(li);
            return true;
        }

        const range = selection.getRangeAt(0);
        const afterRange = document.createRange();
        afterRange.selectNodeContents(li);
        afterRange.setStart(range.startContainer, range.startOffset);
        const fragment = afterRange.extractContents();

        ensureTaskCheckbox(li);
        if (isEmptyTaskListItem(li) && !li.querySelector('br')) {
            li.appendChild(document.createElement('br'));
        }

        const newLi = document.createElement('li');
        newLi.appendChild(createTaskCheckbox());
        newLi.appendChild(document.createTextNode('\u200B'));
        while (fragment.firstChild) {
            const child = fragment.firstChild;
            if (
                child.nodeType === Node.ELEMENT_NODE &&
                (child as HTMLElement).tagName === 'INPUT' &&
                (child as HTMLInputElement).type === 'checkbox'
            ) {
                fragment.removeChild(child);
                continue;
            }
            // Drop a leading ZWSP/space from the split fragment; the new item
            // already has its own caret anchor.
            if (
                child.nodeType === Node.TEXT_NODE &&
                newLi.childNodes.length === 2 &&
                /^[\u200B\s]/.test(child.textContent || '')
            ) {
                child.textContent = (child.textContent || '').replace(/^[\u200B\s]+/, '');
                if (!child.textContent) {
                    fragment.removeChild(child);
                    continue;
                }
            }
            newLi.appendChild(child);
        }
        if (isEmptyTaskListItem(newLi)) {
            // Keep a trailing <br> so the empty item has a line box, but the
            // caret still lives in the ZWSP after the checkbox.
            if (![...newLi.childNodes].some((n) => n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'BR')) {
                newLi.appendChild(document.createElement('br'));
            }
        }
        ensureTaskItemCaretAnchor(newLi);
        li.after(newLi);
        placeCaretInTaskItem(newLi, true);
        return true;
    }

    function insertOrToggleTaskList() {
        const wysiwygEl = getRoot();
        if (!wysiwygEl) return;
        wysiwygEl.focus();
        const li = getListItemFromSelection();
        if (li && isTaskListItem(li)) {
            removeTaskCheckbox(li);
            onInput();
            return;
        }
        if (li) {
            ensureTaskCheckbox(li);
            placeCaretInTaskItem(li, false);
            onInput();
            return;
        }
        document.execCommand(
            'insertHTML',
            false,
            '<ul><li><input type="checkbox" contenteditable="false">\u200B<br></li></ul>'
        );
        prepareTaskListCheckboxes(wysiwygEl);
        const created = getListItemFromSelection();
        if (created) placeCaretInTaskItem(created, true);
        onInput();
    }

    // True when the collapsed caret sits at the very start of a task item,
    // i.e. nothing editable between the checkbox and the caret.
    function isCaretAtTaskItemStart(li: HTMLElement): boolean {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);
        if (!range.collapsed) return false;
        const node = range.startContainer;
        if (node === li) {
            const offset = range.startOffset;
            for (let i = 0; i < offset; i++) {
                if (!isZwspOnlyText(li.childNodes[i])) return false;
            }
            return true;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            const before = (node.textContent || '').slice(0, range.startOffset);
            if (before.replace(/\u200B/g, '').length > 0) return false;
            let prev: Node | null = node.previousSibling;
            while (prev && isZwspOnlyText(prev)) prev = prev.previousSibling;
            return !!prev && prev instanceof HTMLInputElement && prev.type === 'checkbox';
        }
        return false;
    }

    // Backspace at the very start of a task item: with a previous item, merge
    // (standard list behavior); otherwise remove the checkbox so the item
    // becomes a plain bullet.
    function handleTaskListBackspace(): boolean {
        const li = getListItemFromSelection();
        if (!li || !isTaskListItem(li)) return false;
        if (!isCaretAtTaskItemStart(li)) return false;
        const prev = li.previousElementSibling;
        if (prev && prev.tagName === 'LI') {
            appendListItemContent(prev as HTMLElement, li);
            placeCaretAtLiEnd(prev as HTMLElement);
            onInput();
            return true;
        }
        removeTaskCheckbox(li);
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(li);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        onInput();
        return true;
    }

    // True when the collapsed caret is at the very start of an li, with only
    // whitespace/ZWSP/br between the li's beginning and the caret.
    function isCaretAtLiStart(li: HTMLElement): boolean {
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const beforeIsStructural = (n: Node | null): boolean =>
            !!n && ((n.nodeType === Node.TEXT_NODE && /^[\u200B\s]*$/.test(n.textContent || '')) ||
                (n.nodeType === Node.ELEMENT_NODE && n.nodeName === 'BR'));
        if (node === li) {
            for (let i = 0; i < range.startOffset; i++) {
                if (!beforeIsStructural(li.childNodes[i])) return false;
            }
            return true;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            if (!/^[\u200B\s]*$/.test((node.textContent || '').slice(0, range.startOffset))) return false;
            let prev: Node | null = node.previousSibling;
            while (prev && beforeIsStructural(prev)) prev = prev.previousSibling;
            return !prev;
        }
        return false;
    }

    // True when the collapsed caret is at the very end of an li, with only
    // whitespace/ZWSP/br between the caret and the li's end.
    function isCaretAtLiEnd(li: HTMLElement): boolean {
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const afterIsStructural = (n: Node | null): boolean =>
            !!n && ((n.nodeType === Node.TEXT_NODE && /^[\u200B\s]*$/.test(n.textContent || '')) ||
                (n.nodeType === Node.ELEMENT_NODE && n.nodeName === 'BR'));
        if (node === li) {
            for (let i = range.startOffset; i < li.childNodes.length; i++) {
                if (!afterIsStructural(li.childNodes[i])) return false;
            }
            return true;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            if (!/^[\u200B\s]*$/.test((node.textContent || '').slice(range.startOffset))) return false;
            let next: Node | null = node.nextSibling;
            while (next && afterIsStructural(next)) next = next.nextSibling;
            return !next;
        }
        return false;
    }

    function placeCaretAtLiEnd(li: HTMLElement) {
        const wysiwygEl = getRoot();
        const selection = window.getSelection();
        if (!selection) return;
        wysiwygEl?.focus();
        const range = document.createRange();
        if (isTaskListItem(li)) {
            const anchor = ensureTaskItemCaretAnchor(li);
            if (anchor) {
                range.setStart(anchor, anchor.length);
                range.collapse(true);
            } else {
                range.selectNodeContents(li);
                range.collapse(false);
            }
        } else {
            range.selectNodeContents(li);
            range.collapse(false);
        }
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function placeCaretAtBlockStart(el: HTMLElement) {
        const wysiwygEl = getRoot();
        const selection = window.getSelection();
        if (!selection) return;
        wysiwygEl?.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    // Merges the content of `source` li into the end of `target` li, dropping
    // the source's checkbox and structural whitespace. Manual DOM merge so the
    // browser never rebuilds the <li> (Chrome drops the checkbox inputs when
    // it natively merges list items).
    function appendListItemContent(target: HTMLElement, source: HTMLElement) {
        const frag = document.createDocumentFragment();
        for (const child of Array.from(source.childNodes)) {
            if (
                child.nodeType === Node.ELEMENT_NODE &&
                (child as HTMLElement).tagName === 'INPUT' &&
                (child as HTMLInputElement).type === 'checkbox'
            ) {
                continue;
            }
            frag.appendChild(child);
        }
        while (frag.firstChild && frag.firstChild.nodeType === Node.TEXT_NODE && /^[\u200B\s]*$/.test(frag.firstChild.textContent || '')) {
            frag.removeChild(frag.firstChild);
        }
        while (frag.lastChild && frag.lastChild.nodeType === Node.ELEMENT_NODE && (frag.lastChild as HTMLElement).tagName === 'BR') {
            frag.removeChild(frag.lastChild);
        }
        const lastTarget = target.lastChild;
        if (
            lastTarget && lastTarget.nodeType === Node.TEXT_NODE &&
            frag.firstChild && frag.firstChild.nodeType === Node.TEXT_NODE
        ) {
            target.appendChild(document.createTextNode(' '));
        }
        if (frag.childNodes.length > 0) target.appendChild(frag);
        const list = source.parentElement;
        source.remove();
        if (list && !list.querySelector('li')) list.remove();
        if (![...target.childNodes].some((n) => n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'BR')) {
            if (!target.textContent?.replace(/\u200B/g, '').trim()) target.appendChild(document.createElement('br'));
        }
        ensureTaskItemCaretAnchor(target);
    }

    // Delete at a task-list boundary: never let the browser natively merge
    // list items, because Chrome rebuilds the <li> elements and drops the
    // checkbox inputs (turning "- [ ] A" into "-  A" or corrupting the list).
    function handleTaskBoundaryDelete(): boolean {
        const wysiwygEl = getRoot();
        const li = getListItemFromSelection();
        if (!li || !wysiwygEl?.contains(li)) return false;
        const selection = window.getSelection();
        if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;
        const isTask = isTaskListItem(li);
        const next = li.nextElementSibling;
        const prev = li.previousElementSibling;
        const nextIsLi = !!next && next.tagName === 'LI';
        const prevIsLi = !!prev && prev.tagName === 'LI';
        const nextIsTask = nextIsLi && isTaskListItem(next as HTMLElement);
        const prevIsTask = prevIsLi && isTaskListItem(prev as HTMLElement);

        if (isCaretAtLiEnd(li)) {
            // Delete at the end merges the following item into this one.
            if (isTask || nextIsTask) {
                if (nextIsLi) {
                    appendListItemContent(li, next as HTMLElement);
                    placeCaretAtLiEnd(li);
                } else if (next) {
                    // A block follows: move the caret into it instead of
                    // letting Chrome absorb the list item into the block.
                    placeCaretAtBlockStart(next as HTMLElement);
                } else {
                    return false;
                }
                onInput();
                return true;
            }
            return false;
        }

        if (isCaretAtLiStart(li)) {
            // Delete at the very start of an empty item merges the previous
            // item into it.
            if ((isTask || prevIsTask) && !li.textContent?.replace(/\u200B/g, '').trim()) {
                if (prevIsLi) {
                    const frag = document.createDocumentFragment();
                    while (prev.firstChild) frag.appendChild(prev.firstChild);
                    li.insertBefore(frag, li.firstChild);
                    if (prevIsTask) ensureTaskItemCaretAnchor(li);
                    placeCaretAtLiEnd(li);
                    onInput();
                    return true;
                }
                return false;
            }
            return false;
        }
        return false;
    }

    // Backspace at the start of a plain item whose previous item is a task
    // item would let Chrome merge and rebuild the task <li>. Merge manually.
    function handlePlainItemBackspaceIntoTask(): boolean {
        const wysiwygEl = getRoot();
        const li = getListItemFromSelection();
        if (!li || isTaskListItem(li) || !wysiwygEl?.contains(li)) return false;
        if (!isCaretAtLiStart(li)) return false;
        const prev = li.previousElementSibling;
        if (!prev || prev.tagName !== 'LI' || !isTaskListItem(prev as HTMLElement)) return false;
        appendListItemContent(prev as HTMLElement, li);
        placeCaretAtLiEnd(prev as HTMLElement);
        onInput();
        return true;
    }

    // Tab/Shift+Tab inside a list item (bullet, ordered, or task list) indents
    // and outdents. The <li> nodes are moved wholesale so checkboxes and any
    // nested lists stay intact (the browser's native editing rebuilds items and
    // drops checkbox inputs).
    function handleWysiwygTab(e: KeyboardEvent): boolean {
        const wysiwygEl = getRoot();
        const li = getListItemFromSelection();
        if (!li || !wysiwygEl?.contains(li)) return false;
        const list = li.parentElement;
        if (!list || !/^(UL|OL)$/.test(list.tagName)) return false;
        return e.shiftKey ? outdentListItem(li) : indentListItem(li);
    }

    // Remembers the caret position as (node, offset) plain values, so the
    // position can be re-applied after a DOM move. (A cloned Range gets
    // re-mapped by Chrome when list nodes are moved around in a
    // contenteditable, silently dropping the caret into a neighboring text
    // node.)
    function saveWysiwygCaret(): { node: Node; offset: number } | null {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const range = selection.getRangeAt(0);
        return { node: range.startContainer, offset: range.startOffset };
    }

    function restoreWysiwygCaret(caret: { node: Node; offset: number } | null) {
        if (!caret) return;
        const selection = window.getSelection();
        const range = document.createRange();
        try {
            range.setStart(caret.node, caret.offset);
        } catch {
            return;
        }
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }

    // Nests the item (with its own nested lists) under the previous item.
    function indentListItem(li: HTMLElement): boolean {
        const list = li.parentElement;
        if (!list || !/^(UL|OL)$/.test(list.tagName)) return false;
        const prev = li.previousElementSibling;
        if (!prev || prev.tagName !== 'LI') return false;

        const savedCaret = saveWysiwygCaret();
        let nested: HTMLElement | null = null;
        for (let i = 0; i < prev.childNodes.length; i++) {
            const child = prev.childNodes[i];
            if (child instanceof HTMLElement && /^(UL|OL)$/.test(child.tagName)) {
                nested = child;
                break;
            }
        }
        if (!nested) {
            nested = document.createElement(list.tagName);
            prev.appendChild(nested);
        }
        nested.appendChild(li);
        restoreWysiwygCaret(savedCaret);
        onInput();
        return true;
    }

    // Moves the item out of its nested list, placing it after its parent item.
    function outdentListItem(li: HTMLElement): boolean {
        const list = li.parentElement;
        if (!list || !/^(UL|OL)$/.test(list.tagName)) return false;
        const parentLi = list.parentElement;
        if (!parentLi || parentLi.tagName !== 'LI') return false;
        const outerList = parentLi.parentElement;
        if (!outerList || !/^(UL|OL)$/.test(outerList.tagName)) return false;

        const savedCaret = saveWysiwygCaret();
        li.remove();
        if (!list.querySelector('li')) list.remove();
        parentLi.after(li);
        restoreWysiwygCaret(savedCaret);
        onInput();
        return true;
    }

    // Repairs DOMs the browser already corrupted (e.g. a native merge put
    // several checkboxes into one <li>): split them back into separate items.
    function healTaskListStructure() {
        const wysiwygEl = getRoot();
        if (!wysiwygEl) return;
        wysiwygEl.querySelectorAll('li').forEach((li) => {
            const boxes = Array.from(li.children).filter(
                (c): c is HTMLInputElement => c instanceof HTMLInputElement && c.type === 'checkbox'
            );
            for (let i = 1; i < boxes.length; i++) {
                const box = boxes[i];
                const newLi = document.createElement('li');
                let node: Node | null = box;
                while (node) {
                    const nextNode: ChildNode | null = node.nextSibling;
                    newLi.appendChild(node);
                    node = nextNode;
                }
                if (
                    ![...newLi.childNodes].some((n) => n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'BR') &&
                    isEmptyTaskListItem(newLi)
                ) {
                    newLi.appendChild(document.createElement('br'));
                }
                li.after(newLi);
            }
        });
        prepareTaskListCheckboxes(wysiwygEl);
    }


    return {
        getListItemFromSelection,
        handleTaskListEnter,
        insertOrToggleTaskList,
        handleTaskListBackspace,
        handleTaskBoundaryDelete,
        handlePlainItemBackspaceIntoTask,
        handleWysiwygTab,
        healTaskListStructure,
    };
}

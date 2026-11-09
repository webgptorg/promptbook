/**
 * Transferable edit history of one Monaco model. Monaco cannot export its undo stack, so the editor records the content
 * changes it applies (offset-based, relative to the text before each change) and follows undo/redo by the model's
 * alternative version id. Replaying the recorded changes into a new model recreates the text, the undo stack and the
 * redo stack, so a document moved to another window keeps its undo history.
 */

/** One recorded change event: its edits in the coordinates of the text before it. */
function changesOf(event) {
    return event.changes.map((change) => ({ offset: change.rangeOffset, length: change.rangeLength, text: change.text }));
}

/** Applies one recorded change event as its own undo step. */
function apply(model, changes) {
    const operations = changes.map((change) => {
        const start = model.getPositionAt(change.offset);
        const end = model.getPositionAt(change.offset + change.length);
        return { range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column }, text: change.text };
    });
    model.pushStackElement();
    model.pushEditOperations([], operations, () => null);
    model.pushStackElement();
}

/**
 * Follows a model's history from its current text. With a transferred `history` (`{ base, undo, redo }`) the model must
 * hold `history.base`; its undo steps are replayed and its redo steps replayed and undone again first.
 */
export function trackHistory(model, history) {
    const base = history ? history.base : model.getValue();
    /** Applied steps (oldest first), each with the alternative version id it produced. */
    const undo = [];
    /** Undone groups (each in chronological order), the next redo last. */
    const redo = [];
    const listener = model.onDidChangeContent((event) => {
        const now = model.getAlternativeVersionId();
        if (event.isUndoing) {
            const group = [];
            while (undo.length && undo[undo.length - 1].alt !== now) group.unshift(undo.pop());
            if (group.length) redo.push(group);
        } else if (event.isRedoing) {
            const group = redo.pop() || [];
            // Redo restores each step's alternative version id; the group's last step is the current state.
            undo.push(...group);
            if (undo.length && undo[undo.length - 1].alt !== now) undo[undo.length - 1].alt = now;
        } else {
            undo.push({ changes: changesOf(event), alt: now });
            redo.length = 0;
        }
    });
    if (history) {
        for (const changes of history.undo || []) apply(model, changes);
        let undone = 0;
        // Redo groups are re-applied oldest first (the next redo is the last group), then undone again.
        for (const group of [...(history.redo || [])].reverse()) for (const changes of group) {
            apply(model, changes);
            undone++;
        }
        for (let step = 0; step < undone; step++) model.undo();
    }
    return {
        /** The history to transfer with the document: the base text and the recorded undo and redo steps. */
        export: () => ({ base, undo: undo.map((step) => step.changes), redo: redo.map((group) => group.map((step) => step.changes)) }),
        dispose: () => listener.dispose(),
    };
}

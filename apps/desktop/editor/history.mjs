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

/** Applies one undo step: its recorded change events, in order, as a single undo element. */
function apply(model, step) {
    model.pushStackElement();
    for (const changes of step) {
        const operations = changes.map((change) => {
            const start = model.getPositionAt(change.offset);
            const end = model.getPositionAt(change.offset + change.length);
            return { range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column }, text: change.text };
        });
        model.pushEditOperations([], operations, () => null);
    }
    model.pushStackElement();
}

/**
 * The alternative version ids at which the model's undo elements end, so recorded changes keep Monaco's own grouping
 * (consecutive typing is one undo step). Without that information every change event is its own step.
 */
function stepEnds(model) {
    try {
        const elements = model._undoRedoService.getElements(model.uri).past;
        // An open element keeps its fields; a closed one is serialized (its after-version id is at byte 4, big-endian).
        const end = (data) => (data instanceof ArrayBuffer ? new DataView(data).getUint32(4) : data && data.afterVersionId);
        const ends = new Set(elements.map((element) => end(element._data)).filter(Number.isFinite));
        return ends.size ? ends : undefined;
    } catch {
        return undefined;
    }
}

/** Splits recorded changes into undo steps that end at the given version ids (or one step per change). */
function steps(entries, ends) {
    const result = [];
    let step = [];
    for (const entry of entries) {
        step.push(entry.changes);
        if (!ends || ends.has(entry.alt)) {
            result.push(step);
            step = [];
        }
    }
    if (step.length) result.push(step);
    return result;
}

/**
 * Follows a model's history from its current text. With a transferred `history` (`{ base, undo, redo }`, each a list of
 * steps of change events) the model must hold `history.base`; its undo steps are replayed, then its redo steps are
 * replayed and undone again.
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
        for (const step of history.undo || []) apply(model, step);
        // Redo groups are re-applied oldest first (the next redo is the last group), then undone again.
        const redone = [...(history.redo || [])].reverse();
        for (const step of redone) apply(model, step);
        for (let step = 0; step < redone.length; step++) model.undo();
    }
    return {
        /** The history to transfer with the document: the base text and the recorded undo and redo steps. */
        export: () => ({ base, undo: steps(undo, stepEnds(model)), redo: redo.map((group) => group.map((step) => step.changes)) }),
        dispose: () => listener.dispose(),
    };
}

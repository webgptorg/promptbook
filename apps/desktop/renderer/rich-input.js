import { TextEditor } from '../../../src/ui/composer.ts';

/** Browser presentation of the CLI's shared composer model, retaining complete ordered paste/file payloads. */
export function createRichInput({ initial = [], singleLine = false, placeholder = '', question = '' }) {
    const field = document.createElement('div');
    field.className = 'rich-field';
    field.contentEditable = 'true';
    field.role = 'textbox';
    field.setAttribute('aria-label', question);
    field.setAttribute('aria-multiline', String(!singleLine));
    field.dataset.placeholder = placeholder;
    const items = new Map();
    let sequence = 0;

    /** Creates protected compact tokens while text remains natively selectable/editable. */
    function fragment(segments) {
        const result = document.createDocumentFragment();
        for (const segment of segments) {
            if (segment.type === 'text' && !segment.pasted) { result.append(document.createTextNode(segment.text)); continue; }
            const id = String(++sequence);
            items.set(id, segment);
            const chip = document.createElement('span');
            chip.contentEditable = 'false';
            chip.dataset.item = id;
            chip.className = 'rich-item';
            chip.textContent = segment.type === 'text' ? `[Pasted text · ${segment.text.length.toLocaleString()} characters]` : `[${segment.kind === 'image' ? 'Image' : 'File'}: ${segment.name}]`;
            chip.title = segment.type === 'text' ? segment.text.slice(0, 500) : segment.path;
            result.append(chip);
        }
        return result;
    }

    /** Inserts at the actual browser selection, preserving attachment positions. */
    function insert(segments) {
        field.focus();
        const selection = window.getSelection();
        let range = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
        if (!range || !field.contains(range.commonAncestorContainer)) { range = document.createRange(); range.selectNodeContents(field); range.collapse(false); }
        range.deleteContents();
        const nodes = fragment(segments);
        const last = nodes.lastChild;
        range.insertNode(nodes);
        if (last) { range.setStartAfter(last); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); }
    }

    /** Reads native DOM editing as segments and lets the shared model normalize them. */
    function segments() {
        const result = [];
        const read = (node) => {
            if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) result.push({ type: 'text', text: node.textContent }); return; }
            if (node.dataset?.item) { const item = items.get(node.dataset.item); if (item) result.push(item); return; }
            if (node.nodeName === 'BR') { result.push({ type: 'text', text: '\n' }); return; }
            if (node.nodeName === 'DIV' && result.length) result.push({ type: 'text', text: '\n' });
            for (const child of node.childNodes) read(child);
        };
        for (const child of field.childNodes) read(child);
        return new TextEditor(result).segments();
    }

    field.append(fragment(new TextEditor(initial).segments()));
    field.addEventListener('paste', (event) => {
        event.preventDefault();
        const model = new TextEditor();
        model.paste(event.clipboardData.getData('text/plain'));
        insert(model.segments());
    });
    field.addEventListener('drop', (event) => event.preventDefault());
    field.addEventListener('keydown', (event) => {
        if (singleLine && event.key === 'Enter') { event.preventDefault(); field.closest('form')?.requestSubmit(); }
    });
    return { field, segments, attach: (attachments) => insert(attachments) };
}

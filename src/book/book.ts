import { matchCommitmentKeyword } from './commitments.js';
import { formatModelContent, modelFromRows, modelOfDocument, renderModelLines, type ModelRow, type ParsedModel } from './model.js';
import { commitmentsOf, parseBook, type BookDiagnostic, type BookDocument, type EntityKind } from './parse.js';
import { DECLARATION_KEYWORD, renderCommitment, renderDeclaration } from './write.js';

/** UTF-16 offsets of the parser's lines in the original string, including a possible BOM and mixed line endings. */
function lineStarts(source: string): number[] {
    const starts = [0];
    for (const match of source.matchAll(/\n/g)) starts.push(match.index + 1);
    return starts;
}

/**
 * One editable Book. The literal source is authoritative; structured edits change only the affected text.
 * Mutators return this instance so a caller can make several changes before saving to its own storage.
 *
 * @public
 */
export class Book {
    private parsed?: BookDocument;

    private constructor(private source: string) {}

    /** Open any source, including an unfinished or legacy draft, without converting it. */
    public static parse(source: string): Book {
        return new Book(source);
    }

    /** Start a new Book with the language's canonical declaration. */
    public static create(kind: EntityKind, name: string): Book {
        return new Book(renderDeclaration(kind, name) + '\n');
    }

    /** The shared parser's read-only view, including commitment occurrences and their source locations. */
    public get document(): BookDocument {
        return this.parsed ??= parseBook(this.source);
    }

    /** The declared kind, or the parser's empty/invalid state for an unfinished draft. */
    public get kind(): BookDocument['kind'] {
        return this.document.kind;
    }

    /** The name on this Book's opening line. */
    public get name(): string {
        return this.document.name;
    }

    /** The Book's own MODEL alternatives and diagnostics. Chats use their most recent selection. */
    public get model(): ParsedModel {
        return modelOfDocument(this.document, { multiple: this.kind === 'chat' ? 'last' : 'error' });
    }

    /** Syntax and MODEL diagnostics for an editor, even while the draft is incomplete. */
    public get diagnostics(): BookDiagnostic[] {
        return [...this.document.diagnostics, ...this.model.diagnostics];
    }

    /** Apply a raw editor draft. All structured reads now reflect that text. */
    public setSource(source: string): this {
        this.source = source;
        this.parsed = undefined;
        return this;
    }

    /** Serialize the exact current draft. */
    public toString(): string {
        return this.source;
    }

    /** Rename the declaration, retaining its surrounding whitespace and every other line. */
    public rename(name: string): this {
        const kind = this.document.declaredKind;
        if (!kind) throw new Error('Renaming needs an opening Book declaration.');
        if (name === this.name && name) return this;
        const keyword = DECLARATION_KEYWORD[kind];
        const nextName = renderDeclaration(kind, name).slice(keyword.length + 1);
        const { headerLine, lines } = this.document;
        const header = lines[headerLine]!;
        const column = this.name ? header.indexOf(this.name, keyword.length) : header.length;
        const bom = headerLine === 0 && this.source.startsWith('\uFEFF') ? 1 : 0;
        const start = lineStarts(this.source)[headerLine]! + bom + column;
        const separator = column === keyword.length ? ' ' : '';
        return this.setSource(this.source.slice(0, start) + separator + nextName + this.source.slice(start + this.name.length));
    }

    /** Append one commitment; multiline values are escaped by the same writer as engine-authored Books. */
    public addCommitment(keyword: string, content: string): this {
        const match = matchCommitmentKeyword(keyword);
        if (!match || match.written !== keyword || /[\r\n]/.test(keyword) || match.definition.kind === 'declaration') {
            throw new Error('Expected one Book commitment keyword.');
        }
        return this.append(renderCommitment(keyword, content));
    }

    /** Write whole alternative rows. A single empty row is the explicit wildcard, MODEL *. */
    public setModel(rows: readonly ModelRow[]): this {
        if (!this.document.declaredKind) throw new Error('Changing MODEL needs an opening Book declaration.');
        const selection = modelFromRows(rows);
        const current = this.model;
        if (current.constraint.explicit && !current.diagnostics.length && formatModelContent(current.constraint) === formatModelContent(selection)) return this;

        const replacement = renderModelLines(selection);
        const existing = commitmentsOf(this.document, 'MODEL');
        if (!existing.length || this.kind === 'chat') return this.append(replacement);

        // Agent/task duplicates are syntax errors. An explicit new selection repairs them in place.
        const starts = lineStarts(this.source);
        const { lines, newline } = this.document;
        let source = this.source;
        for (const block of existing.slice().reverse()) {
            let last = block.endLine - 1;
            while (last > block.startLine && lines[last]!.trim() === '') last--;
            const start = starts[block.startLine]!;
            if (block === existing[0]) {
                const end = starts[last]! + lines[last]!.length;
                source = source.slice(0, start) + replacement.join(newline) + source.slice(end);
            } else {
                source = source.slice(0, start) + source.slice(starts[last + 1] ?? source.length);
            }
        }
        return this.setSource(source);
    }

    /** Append after the original text; a chat keeps its message separators and chronological record. */
    private append(lines: readonly string[]): this {
        if (!this.document.declaredKind) throw new Error('Adding a commitment needs an opening Book declaration.');
        const { newline } = this.document;
        const terminated = this.source.endsWith('\n');
        const suffix = this.kind === 'chat' ? newline + newline : terminated ? newline : '';
        const source = this.source + (terminated ? '' : newline) + lines.join(newline) + suffix;
        const parsed = parseBook(source);
        if (parsed.commitments.length !== this.document.commitments.length + 1) {
            throw new Error('The new commitment would be literal text. Close the open code fence first.');
        }
        this.source = source;
        this.parsed = parsed;
        return this;
    }
}

export type { EntityKind, ModelRow };

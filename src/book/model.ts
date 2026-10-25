import { matchEnum } from '../common/naming.js';
import { HARNESS_VARIANTS, THINKING_LEVELS, harnessVariantOf, type HarnessVariant, type ThinkingLevel } from '../tools/model.js';
import { commitmentsOf, type BookCommitment, type BookDiagnostic, type BookDocument } from './parse.js';

/**
 * Fields of one MODEL alternative, in their canonical written order.
 *
 * @private MODEL commitment
 */
export const MODEL_FIELDS = ['harness', 'model', 'thinking', 'provider', 'origin', 'runtime'] as const;

/**
 * One field of a MODEL alternative.
 *
 * @private MODEL commitment
 */
export type ModelField = (typeof MODEL_FIELDS)[number];

/**
 * Endpoint keywords of the `runtime` field (an explicit base URL is the fourth form).
 *
 * - `default`: the selected tool's configured endpoint (official when the tool sets none)
 * - `official`: the fixed provider endpoint declared by the harness plugin
 * - `local`: inference on the engine's own host
 *
 * @private MODEL commitment
 */
export const RUNTIME_KEYWORDS = ['default', 'official', 'local'] as const;

/**
 * One complete alternative: its fields apply together. An absent field permits any supported value.
 *
 * @private MODEL commitment
 */
export type ModelRow = {
    /** Harness variant (`OPENAI_CODEX`). */
    readonly harness?: HarnessVariant;
    /** The adapter's own model identifier. */
    readonly model?: string;
    /** Reasoning/effort level. */
    readonly thinking?: ThinkingLevel;
    /** The model's actual manufacturer (not its harness, host or billing account). */
    readonly provider?: string;
    /** The model's declared country of origin. */
    readonly origin?: string;
    /** `default`, `official`, `local` or an explicit base URL. */
    readonly runtime?: string;
};

/**
 * Allowed execution combinations: alternative rows (never a union of independent columns).
 *
 * A missing MODEL and `MODEL *` both mean one unconstrained row; an empty row list means no combination is possible
 * (the intersection of contradictory requirements).
 *
 * @private MODEL commitment
 */
export type ModelConstraint = {
    /** Alternative complete combinations. */
    readonly rows: readonly ModelRow[];
    /** Whether some Book stated it explicitly (as opposed to the absence of any MODEL). */
    readonly explicit: boolean;
};

/**
 * No additional constraint (a missing MODEL): not missing authorization, and no invented capability.
 *
 * @private MODEL commitment
 */
export const UNCONSTRAINED: ModelConstraint = { rows: [{}], explicit: false };

/**
 * A parsed MODEL commitment with its source location and problems.
 *
 * @private MODEL commitment
 */
export type ParsedModel = {
    /** The constraint (unconstrained when the source has problems: affected work is blocked by its diagnostics). */
    readonly constraint: ModelConstraint;
    /** The commitment the constraint was read from. */
    readonly commitment?: BookCommitment;
    /** Problems with 1-based Book line numbers. */
    readonly diagnostics: readonly BookDiagnostic[];
};

/**
 * Normalizes one field value (or explains why it is unsupported).
 */
function normalizeField(field: ModelField, value: string): { value?: string; problem?: string } {
    if (value === '*') return {};
    switch (field) {
        case 'harness': {
            const variant = matchEnum(value, HARNESS_VARIANTS) ?? harnessVariantOf(value.toLowerCase());
            return variant ? { value: variant } : { problem: `harness=${value} is not a supported harness variant (use one of ${HARNESS_VARIANTS.join(', ')})` };
        }
        case 'thinking': {
            const level = matchEnum(value, THINKING_LEVELS);
            return level ? { value: level } : { problem: `thinking=${value} is not a thinking level (use one of ${THINKING_LEVELS.join(', ')})` };
        }
        case 'runtime': {
            const keyword = matchEnum(value, RUNTIME_KEYWORDS);
            if (keyword) return { value: keyword };
            if (!/^https?:\/\/\S+$/i.test(value)) return { problem: `runtime=${value} is not default, official, local or an http(s) base URL` };
            try {
                const url = new URL(value);
                if (url.username || url.password) return { problem: 'runtime URLs must not contain credentials (keep secrets in .env)' };
            } catch {
                return { problem: `runtime=${value} is not a valid URL` };
            }
            return { value: normalizeUrl(value) };
        }
        default:
            return { value };
    }
}

/**
 * Comparable spelling of an endpoint URL (no trailing slash).
 *
 * @private MODEL commitment
 */
export function normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

/**
 * Parses one alternative line (`harness=OPENAI_CODEX model=* thinking=high`), or `*` for no constraint.
 *
 * @private MODEL commitment
 */
export function parseModelRow(line: string): { row?: ModelRow; problems: string[] } {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 1 && tokens[0] === '*') return { row: {}, problems: [] };
    // Words without `=` are one problem per line: a sentence is prose (a RULE), never a word-by-word list of errors.
    const loose = tokens.filter((token) => token.indexOf('=') <= 0);
    if (loose.length > 1 && loose.length === tokens.length) {
        const text = line.trim();
        const preview = text.length > 60 ? `${text.slice(0, 59)}…` : text;
        return { problems: [`"${preview}" is prose, not field=value pairs (for example harness=OPENAI_CODEX model=gpt-5 thinking=high; write a preference as a RULE)`] };
    }
    const row: Partial<Record<ModelField, string>> = {};
    const seen = new Set<string>();
    const problems: string[] = [];
    if (loose.length === 1 && tokens.length === 1) problems.push(`"${loose[0]}" is not a field=value pair (for example model=${loose[0]})`);
    else if (loose.length) problems.push(`${loose.map((token) => `"${token}"`).join(', ')} ${loose.length === 1 ? 'is not a field=value pair' : 'are not field=value pairs'}`);
    for (const token of tokens) {
        const separator = token.indexOf('=');
        if (separator <= 0) continue;
        const key = token.slice(0, separator).toLowerCase();
        const raw = token.slice(separator + 1);
        if (!(MODEL_FIELDS as readonly string[]).includes(key)) {
            problems.push(`unknown field "${token.slice(0, separator)}" (use ${MODEL_FIELDS.join(', ')})`);
            continue;
        }
        if (seen.has(key)) {
            problems.push(`${key} appears twice in one alternative`);
            continue;
        }
        seen.add(key);
        if (!raw) {
            problems.push(`${key}= has no value (use ${key}=* for any)`);
            continue;
        }
        const normalized = normalizeField(key as ModelField, raw);
        if (normalized.problem) problems.push(normalized.problem);
        else if (normalized.value !== undefined) row[key as ModelField] = normalized.value;
    }
    return problems.length ? { problems } : { row: row as ModelRow, problems };
}

/**
 * Content lines of a commitment with their 1-based Book line numbers (the keyword's own line first).
 */
function contentLines(document: BookDocument, commitment: BookCommitment): Array<{ text: string; line: number }> {
    const result: Array<{ text: string; line: number }> = [];
    if (commitment.value.trim()) result.push({ text: commitment.value, line: commitment.startLine + 1 });
    for (let index = commitment.startLine + 1; index < commitment.endLine; index++) {
        const text = (document.lines[index] ?? '').replace(/^\\/, '');
        if (text.trim()) result.push({ text, line: index + 1 });
    }
    return result;
}

/**
 * Reads one MODEL commitment: each content line is one alternative.
 *
 * @private MODEL commitment
 */
export function parseModelCommitment(document: BookDocument, commitment: BookCommitment): ParsedModel {
    const diagnostics: BookDiagnostic[] = [];
    const rows: ModelRow[] = [];
    const lines = contentLines(document, commitment);
    if (!lines.length) diagnostics.push({ line: commitment.startLine + 1, message: '`MODEL` has no content; write `MODEL *` for no constraint or field=value alternatives.', severity: 'error' });
    for (const { text, line } of lines) {
        const parsed = parseModelRow(text);
        if (parsed.row) rows.push(parsed.row);
        for (const problem of parsed.problems) diagnostics.push({ line, message: `MODEL: ${problem}.`, severity: 'error' });
    }
    // Problematic content never becomes a guessed runnable selection: the diagnostics block affected work.
    if (diagnostics.length) return { constraint: UNCONSTRAINED, commitment, diagnostics };
    return { constraint: { rows: dedupeRows(rows), explicit: true }, commitment, diagnostics };
}

/**
 * Reads the MODEL of a Book. Agents and tasks have one current MODEL (several are reported); a chat records its
 * resolution chronologically, so its last MODEL is the effective one.
 *
 * @private MODEL commitment
 */
export function modelOfDocument(document: BookDocument, options: { readonly multiple: 'error' | 'last' } = { multiple: 'error' }): ParsedModel {
    const found = commitmentsOf(document, 'MODEL');
    if (!found.length) return { constraint: UNCONSTRAINED, diagnostics: [] };
    const diagnostics: BookDiagnostic[] = [];
    if (found.length > 1 && options.multiple === 'error') {
        diagnostics.push({ line: found[1]!.startLine + 1, message: 'A Book has one current MODEL commitment; write alternatives as lines of one MODEL instead of several MODEL commitments.', severity: 'error' });
    }
    const parsed = parseModelCommitment(document, found[found.length - 1]!);
    return { ...parsed, constraint: diagnostics.length ? UNCONSTRAINED : parsed.constraint, diagnostics: [...diagnostics, ...parsed.diagnostics] };
}

/**
 * Written form of one alternative (`*` when it is unconstrained).
 *
 * @private MODEL commitment
 */
export function formatModelRow(row: ModelRow): string {
    const parts = MODEL_FIELDS.filter((field) => row[field] !== undefined).map((field) => `${field}=${row[field]}`);
    return parts.length ? parts.join(' ') : '*';
}

/**
 * Content of a MODEL commitment (one line per alternative), e.g. `harness=OPENAI_CODEX model=gpt-5 runtime=official`.
 *
 * @private MODEL commitment
 */
export function formatModelContent(constraint: ModelConstraint): string {
    return constraint.rows.map(formatModelRow).join('\n');
}

/**
 * The commitment lines of a MODEL: a single alternative inline, several as continuation lines.
 *
 * @private MODEL commitment
 */
export function renderModelLines(constraint: ModelConstraint): string[] {
    if (constraint.rows.length === 1) return [`MODEL ${formatModelRow(constraint.rows[0]!)}`];
    return ['MODEL', ...constraint.rows.map(formatModelRow)];
}

/**
 * Removes duplicate alternatives (same written form).
 */
function dedupeRows(rows: readonly ModelRow[]): ModelRow[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
        const key = formatModelRow(row);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Whether two values of a field are the same choice (manufacturer/origin names ignore case; URLs ignore a trailing
 * slash; model IDs are exact).
 */
function sameValue(field: ModelField, a: string, b: string): boolean {
    if (field === 'provider' || field === 'origin') return a.toLowerCase() === b.toLowerCase();
    if (field === 'runtime') return normalizeUrl(a) === normalizeUrl(b);
    return a === b;
}

/**
 * Intersects two alternatives field by field; `undefined` when they contradict. `runtime=default` defers to a more
 * specific endpoint.
 *
 * @private MODEL commitment
 */
export function intersectRows(a: ModelRow, b: ModelRow): ModelRow | undefined {
    const result: Partial<Record<ModelField, string>> = {};
    for (const field of MODEL_FIELDS) {
        const left = a[field];
        const right = b[field];
        if (left === undefined || right === undefined) {
            const value = left ?? right;
            if (value !== undefined) result[field] = value;
            continue;
        }
        if (field === 'runtime' && (left === 'default' || right === 'default')) {
            result.runtime = left === 'default' ? right : left;
            continue;
        }
        if (!sameValue(field, left, right)) return undefined;
        result[field] = left;
    }
    return result as ModelRow;
}

/**
 * Intersects two constraints: every compatible pair of alternatives (neither side overwrites the other's explicit
 * restriction; contradictions leave no rows).
 *
 * @private MODEL commitment
 */
export function intersectModels(a: ModelConstraint, b: ModelConstraint): ModelConstraint {
    const rows: ModelRow[] = [];
    for (const left of a.rows) {
        for (const right of b.rows) {
            const row = intersectRows(left, right);
            if (row) rows.push(row);
        }
    }
    return { rows: dedupeRows(rows), explicit: a.explicit || b.explicit };
}

/**
 * Whether no combination satisfies the constraint.
 *
 * @private MODEL commitment
 */
export function isImpossible(constraint: ModelConstraint): boolean {
    return constraint.rows.length === 0;
}

/**
 * Whether an alternative fully determines an execution: concrete harness, model and endpoint, and a thinking level
 * where the harness has one (model-native absence of a thinking control is not an unresolved wildcard).
 *
 * @private MODEL commitment
 */
export function isConcreteRow(row: ModelRow, hasThinking: (variant: HarnessVariant) => boolean): boolean {
    if (!row.harness || !row.model || !row.runtime || row.runtime === 'default') return false;
    return Boolean(row.thinking) || !hasThinking(row.harness);
}

/**
 * The single concrete alternative of a fully determined constraint, if it is one.
 *
 * @private MODEL commitment
 */
export function determinedRow(constraint: ModelConstraint, hasThinking: (variant: HarnessVariant) => boolean): ModelRow | undefined {
    if (constraint.rows.length !== 1) return undefined;
    const row = constraint.rows[0]!;
    return isConcreteRow(row, hasThinking) ? row : undefined;
}

/**
 * A concrete execution combination offered by an enabled tool.
 *
 * @private MODEL commitment
 */
export type ModelCandidate = {
    readonly harness: HarnessVariant;
    readonly model: string;
    readonly thinking?: ThinkingLevel;
    /** Declared manufacturer (unknown stays undefined). */
    readonly provider?: string;
    /** Declared country of origin (unknown stays undefined). */
    readonly origin?: string;
    /** The tool's resolved endpoint: `official`, `local` or a base URL. */
    readonly runtime: string;
};

/**
 * Whether an alternative permits a concrete candidate. Unknown provider/origin metadata never satisfies a
 * restriction.
 *
 * @private MODEL commitment
 */
export function rowAllows(row: ModelRow, candidate: ModelCandidate): boolean {
    if (row.harness && row.harness !== candidate.harness) return false;
    if (row.model && row.model !== candidate.model) return false;
    if (row.thinking && row.thinking !== candidate.thinking) return false;
    if (row.provider && (!candidate.provider || !sameValue('provider', row.provider, candidate.provider))) return false;
    if (row.origin && (!candidate.origin || !sameValue('origin', row.origin, candidate.origin))) return false;
    if (row.runtime && row.runtime !== 'default' && !sameValue('runtime', row.runtime, candidate.runtime)) return false;
    return true;
}

/**
 * Whether any alternative of a constraint permits a candidate.
 *
 * @private MODEL commitment
 */
export function constraintAllows(constraint: ModelConstraint, candidate: ModelCandidate): boolean {
    return constraint.rows.some((row) => rowAllows(row, candidate));
}

/**
 * Short human description of a constraint (`any model` when unconstrained).
 *
 * @private MODEL commitment
 */
export function describeModel(constraint: ModelConstraint): string {
    if (isImpossible(constraint)) return 'no possible combination';
    if (constraint.rows.length === 1 && !Object.keys(constraint.rows[0]!).length) return 'any model';
    return constraint.rows.map(formatModelRow).join(' | ');
}

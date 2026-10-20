import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { readTextIfExists, writeFileAtomic } from '../common/fs.js';
import { ENVIRONMENT_NAME } from '../common/naming.js';
import { formatIsoWithOffset, systemTimeZone } from '../common/time.js';

/**
 * The bounded environment-reference notation `${{ env.NAME }}` (optional whitespace inside the delimiters). It is not
 * an expression language: nothing else is evaluated.
 */
const REFERENCE_PATTERN = /^\$\{\{\s*env\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/;

/**
 * Parses an environment reference; returns the variable name, or `undefined` when the value is not a reference.
 *
 * @private environment references
 */
export function parseEnvironmentReference(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    return REFERENCE_PATTERN.exec(value.trim())?.[1];
}

/**
 * Canonical reference text of a variable name.
 *
 * @private environment references
 */
export function environmentReference(name: string): string {
    if (!ENVIRONMENT_NAME.test(name)) throw new PtbkError(`"${name}" is not a valid environment-variable name.`, { kind: 'usage', next: ['Use letters, digits and underscores, not starting with a digit.'] });
    return `\${{ env.${name} }}`;
}

/**
 * Path of the project's ignored local environment file.
 *
 * @private environment references
 */
export function dotEnvPath(projectRoot: string): string {
    return join(projectRoot, '.env');
}

/**
 * One assignment line of a `.env` file.
 */
type Assignment = { readonly line: number; readonly name: string; readonly value: string };

/**
 * Parsed `.env` content: active assignments by name (never executed as shell code).
 *
 * @private environment references
 */
export type DotEnv = {
    /** Whether the file exists. */
    readonly exists: boolean;
    /** Original text. */
    readonly text: string;
    /** Active (uncommented) assignments, in file order. */
    readonly assignments: readonly Assignment[];
};

/**
 * Pattern of an active assignment (`NAME=value` or `export NAME=value`).
 */
const ASSIGNMENT_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

/**
 * Unquotes an assignment value (single/double quotes; an unquoted value ends at an inline ` #` comment).
 */
function assignmentValue(raw: string): string {
    const value = raw.trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
        const inner = value.slice(1, -1);
        return value.startsWith('"') ? inner.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\') : inner;
    }
    return value.replace(/\s+#.*$/, '');
}

/**
 * Reads the project's `.env` without executing it.
 *
 * @private environment references
 */
export async function readDotEnv(projectRoot: string): Promise<DotEnv> {
    const text = await readTextIfExists(dotEnvPath(projectRoot));
    if (text === undefined) return { exists: false, text: '', assignments: [] };
    const assignments: Assignment[] = [];
    text.split(/\r?\n/).forEach((line, index) => {
        const match = ASSIGNMENT_PATTERN.exec(line);
        if (match) assignments.push({ line: index, name: match[1]!, value: assignmentValue(match[2] ?? '') });
    });
    return { exists: true, text, assignments };
}

/**
 * Where a resolved reference came from (never the value itself).
 *
 * @private environment references
 */
export type CredentialSource = 'environment' | '.env' | 'missing' | 'ambiguous';

/**
 * A resolved environment reference. `value` is runtime-only secret material: never persist, log or display it.
 *
 * @private environment references
 */
export type ResolvedReference = {
    readonly name: string;
    readonly source: CredentialSource;
    readonly value?: string;
};

/**
 * Resolves a variable: an explicitly supplied process-environment value takes precedence over the project's `.env`.
 * Duplicate active `.env` assignments with different values are ambiguous (never guessed).
 *
 * @private environment references
 */
export function resolveVariable(name: string, env: NodeJS.ProcessEnv, dotEnv: DotEnv): ResolvedReference {
    const fromProcess = env[name];
    if (fromProcess !== undefined && fromProcess !== '') return { name, source: 'environment', value: fromProcess };
    const assignments = dotEnv.assignments.filter((assignment) => assignment.name === name);
    if (new Set(assignments.map((assignment) => assignment.value)).size > 1) return { name, source: 'ambiguous' };
    const value = assignments[0]?.value;
    if (value !== undefined && value !== '') return { name, source: '.env', value };
    return { name, source: 'missing' };
}

/**
 * Human description of where a credential comes from, without its value.
 *
 * @private environment references
 */
export function describeCredentialSource(resolved: ResolvedReference): string {
    switch (resolved.source) {
        case 'environment':
            return `${resolved.name} from the process environment`;
        case '.env':
            return `${resolved.name} from the project's .env`;
        case 'ambiguous':
            return `${resolved.name} is assigned several different values in .env (repair needed)`;
        case 'missing':
            return `${resolved.name} is not set (process environment or .env)`;
    }
}

/**
 * One requested `.env` change.
 *
 * @private environment references
 */
export type DotEnvChange =
    /** Sets the active value (a changed value keeps the old assignment commented out). */
    | { readonly kind: 'set'; readonly name: string; readonly value: string }
    /** Comments out the active assignment (retirement; never deletion). */
    | { readonly kind: 'retire'; readonly name: string };

/**
 * Outcome of a `.env` edit.
 *
 * @private environment references
 */
export type DotEnvEditOutcome = { readonly changed: boolean; readonly notes: readonly string[] };

/**
 * Quotes a value for `.env` when needed.
 */
function quoteValue(value: string): string {
    if (/[\r\n]/.test(value)) throw new PtbkError('Secret values must be a single line.', { kind: 'usage' });
    return /^[A-Za-z0-9_./:@+=,-]*$/.test(value) ? value : `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Applies changes to the project's `.env` non-destructively: every engine-authored addition, replacement and
 * retirement gets an adjacent timestamped comment with its reason; old assignments are commented out, never deleted;
 * unrelated lines, comments and newline conventions stay intact; a repeated identical edit is a no-op.
 *
 * Secret values never appear in the returned notes.
 *
 * @private environment references
 */
export async function editDotEnv(projectRoot: string, changes: readonly DotEnvChange[], audit: { readonly reason: string; readonly operation: string; readonly timeZone?: string }): Promise<DotEnvEditOutcome> {
    const path = dotEnvPath(projectRoot);
    const original = (await readTextIfExists(path)) ?? '';
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    const lines = original === '' ? [] : original.split(/\r?\n/);
    const trailingNewline = original === '' || original.endsWith('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const stamp = formatIsoWithOffset(Date.now(), audit.timeZone ?? systemTimeZone());
    const comment = (action: string): string => `# ${stamp} ptbk: ${action} — ${audit.reason} (${audit.operation})`.replace(/[\r\n]+/g, ' ');
    const notes: string[] = [];
    let changed = false;
    for (const change of changes) {
        if (!ENVIRONMENT_NAME.test(change.name)) throw new PtbkError(`"${change.name}" is not a valid environment-variable name.`, { kind: 'usage' });
        const active = lines.map((line, index) => ({ index, match: ASSIGNMENT_PATTERN.exec(line) })).filter((entry) => entry.match?.[1] === change.name);
        if (new Set(active.map((entry) => assignmentValue(entry.match![2] ?? ''))).size > 1) {
            throw new PtbkError(`.env assigns ${change.name} several times with different values.`, {
                kind: 'conflict',
                reason: 'The effective value is ambiguous, so ptbk does not choose a destructive interpretation.',
                effect: 'Nothing was changed in .env or ptbk.json.',
                next: [`Keep exactly one active ${change.name}= line in .env (comment out the others), then retry.`],
            });
        }
        if (change.kind === 'set') {
            const current = active[0] ? assignmentValue(active[0].match![2] ?? '') : undefined;
            if (current === change.value) {
                notes.push(`${change.name} already holds this value in .env (unchanged).`);
                continue;
            }
            const assignment = `${change.name}=${quoteValue(change.value)}`;
            if (active.length) {
                // Replace in place: the old assignment stays, commented out with its explanation, followed by the new one.
                const first = active[0]!.index;
                const replacement = [comment('commented out the previous value (replaced below)'), `# ${lines[first]}`, comment('added'), assignment];
                for (const entry of active.slice(1).reverse()) lines.splice(entry.index, 1, comment('commented out a duplicate of the same value'), `# ${lines[entry.index]}`);
                lines.splice(first, 1, ...replacement);
                notes.push(`Replaced ${change.name} in .env (the previous assignment is kept commented out).`);
            } else {
                if (lines.length && lines[lines.length - 1]!.trim() !== '') lines.push('');
                lines.push(comment('added'), assignment);
                notes.push(`Added ${change.name} to .env.`);
            }
            changed = true;
        } else {
            if (!active.length) continue;
            for (const entry of [...active].reverse()) lines.splice(entry.index, 1, comment('commented out (no remaining consumer)'), `# ${lines[entry.index]}`);
            notes.push(`Retired ${change.name} in .env (commented out, not deleted).`);
            changed = true;
        }
    }
    if (!changed) return { changed: false, notes };
    const text = `${lines.join(newline)}${trailingNewline || lines.length ? newline : ''}`;
    await writeFileAtomic(path, text, { mode: 0o600 });
    return { changed: true, notes };
}

/**
 * Whether an active `.env` assignment was added by ptbk (preceded by its audit comment), which is the only case where
 * proven non-use may retire it.
 *
 * @private environment references
 */
export function isEngineManagedAssignment(dotEnv: DotEnv, name: string): boolean {
    const lines = dotEnv.text.split(/\r?\n/);
    const assignment = dotEnv.assignments.find((entry) => entry.name === name);
    if (!assignment || assignment.line === 0) return false;
    return /^# .* ptbk: added — /.test(lines[assignment.line - 1] ?? '');
}

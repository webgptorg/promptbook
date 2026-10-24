import type { TaskPriority } from './model.js';

/**
 * Consistent interpretation of common textual priorities.
 */
const TEXTUAL_PRIORITIES: ReadonlyArray<[RegExp, number]> = [
    [/^(blocker|critical|urgent|asap|highest|top|immediately|emergency)$/i, 10],
    [/^(very\s+high|very\s+important)$/i, 8],
    [/^(high|important|soon|elevated)$/i, 5],
    [/^(normal|medium|ordinary|default|regular|moderate)$/i, 0],
    [/^(low|lowest|minor|later|someday|whenever|trivial|optional)$/i, 0],
];

/**
 * Interprets `TASK PRIORITY`: a nonnegative number, or a recognized textual importance.
 *
 * Unrecognized wording stays unresolved (rank 0) so that Router can interpret it; read-only views report it.
 *
 * @private task priority
 */
export function parsePriority(raw: string | undefined): TaskPriority & { error?: string } {
    if (raw === undefined) return { value: 0, resolved: true };
    const text = raw.trim();
    if (!text) return { value: 0, raw, resolved: false, error: 'TASK PRIORITY is empty.' };
    if (/^\d+(\.\d+)?$/.test(text)) return { value: Number(text), raw, resolved: true };
    if (/^-\d/.test(text)) return { value: 0, raw, resolved: false, error: 'TASK PRIORITY must be nonnegative.' };
    const normalized = text.replace(/[.!]+$/, '').trim();
    for (const [pattern, value] of TEXTUAL_PRIORITIES) {
        if (pattern.test(normalized)) return { value, raw, resolved: true };
    }
    return { value: 0, raw, resolved: false };
}

/**
 * Describes a priority for list/status views.
 *
 * @private task priority
 */
export function describePriority(priority: TaskPriority): string {
    if (!priority.raw) return String(priority.value);
    if (!priority.resolved) return `"${priority.raw}" (unresolved, ranked 0 until Router interprets it)`;
    return /^\d/.test(priority.raw) ? String(priority.value) : `${priority.raw} (${priority.value})`;
}

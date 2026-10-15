import { join } from 'node:path';
import { pathExists } from '../common/fs.js';
import { shortId, slugify } from '../common/ids.js';
import { fileTimestamp } from '../common/time.js';

/**
 * Inputs of a new task Book.
 *
 * @private task authoring
 */
export type NewTaskBook = {
    /** Human title (first line `TASK <title>`). */
    readonly title: string;
    /** Natural-language description. */
    readonly description?: string;
    /** Optional stable ID. */
    readonly id?: string;
    /** Additional commitment lines, e.g. `['TASK AGENT @Developer', 'TASK PRIORITY 2']`. */
    readonly commitments?: readonly string[];
};

/**
 * Renders a task Book source.
 *
 * @private task authoring
 */
export function renderTaskBook(task: NewTaskBook): string {
    const title = task.title.replace(/\s+/g, ' ').trim();
    const lines = [`TASK ${title}`];
    if (task.description?.trim()) lines.push('', task.description.trim());
    const commitments = [...(task.id ? [`TASK ID ${task.id}`] : []), ...(task.commitments ?? [])];
    if (commitments.length) lines.push('', ...commitments);
    return `${lines.join('\n')}\n`;
}

/**
 * Generates a stable task ID from a title (`improve-csv-export-k3x9`).
 *
 * @private task authoring
 */
export function generateTaskId(title: string): string {
    return `${slugify(title, 32)}-${shortId(4)}`;
}

/**
 * Chooses a new, unused task file path: `<tasks>/<YYYY-MM-DD-HHMM>-<slug>.book`.
 *
 * @private task authoring
 */
export async function newTaskPath(tasksDirectory: string, title: string, now: number = Date.now(), timeZone?: string, extension = '.book'): Promise<string> {
    const base = `${fileTimestamp(now, timeZone)}-${slugify(title)}`;
    for (let attempt = 1; ; attempt++) {
        const candidate = join(tasksDirectory, `${base}${attempt === 1 ? '' : `-${attempt}`}${extension}`);
        if (!(await pathExists(candidate))) return candidate;
    }
}

/**
 * Splits a free-form task description into a title (first line) and description (rest).
 *
 * @private task authoring
 */
export function splitTitle(text: string): { title: string; description: string } {
    const trimmed = text.trim();
    const [first = '', ...rest] = trimmed.split(/\r?\n/);
    let title = first.replace(/^#+\s*/, '').replace(/^TASK\s+/, '').trim();
    let description = rest.join('\n').trim();
    if (title.length > 120) {
        const sentence = /^(.{20,120}?[.!?])\s/.exec(title)?.[1];
        description = [title, description].filter(Boolean).join('\n\n');
        title = sentence ?? `${title.slice(0, 117).trimEnd()}…`;
    }
    return { title, description };
}

import { join } from 'node:path';
import { pathExists } from '../common/fs.js';
import { slugify } from '../common/ids.js';
import { fileTimestamp } from '../common/time.js';
import { renderCommitment, renderDeclaration } from '../book/write.js';

/**
 * Inputs of a new task Book.
 *
 * @private task authoring
 */
export type NewTaskBook = {
    /** Task name: the content of the opening `TASK` declaration and the task's identity (see `generatedName`). */
    readonly title: string;
    /** Bounded work and intended result (written under GOAL, losslessly escaped). */
    readonly description?: string;
    /** Additional commitment lines, e.g. `['TASK AGENT @Developer', 'TASK PRIORITY 2']`. */
    readonly commitments?: readonly string[];
};

/**
 * Renders a task Book in the canonical form: `TASK <name>`, the description under GOAL, then commitments.
 *
 * @private task authoring
 */
export function renderTaskBook(task: NewTaskBook): string {
    const lines = [renderDeclaration('task', task.title)];
    if (task.description?.trim()) lines.push(...renderCommitment('GOAL', task.description));
    if (task.commitments?.length) lines.push(...task.commitments);
    return `${lines.join('\n')}\n`;
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

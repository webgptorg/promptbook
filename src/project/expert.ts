import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ENGINE_ROOT, ENGINE_VERSION } from '../common/version.js';
import { COMMITMENTS } from '../book/commitments.js';

/**
 * Directory of the specification shipped with the running engine (Expert's reference material).
 *
 * @private Expert non-agent
 */
export const EXPERT_DOCUMENTATION_DIRECTORY = join(ENGINE_ROOT, 'dist', 'expert');

/**
 * Builds the engine-supplied Expert instructions for the running version.
 *
 * Expert is never materialized into the project; its knowledge always matches the running engine.
 *
 * @private Expert non-agent
 */
export async function expertInstructions(): Promise<string> {
    const commitments = COMMITMENTS.map(
        (commitment) => `- \`${commitment.keyword}\`${commitment.aliases.length ? ` (aliases ${commitment.aliases.map((alias) => `\`${alias}\``).join(', ')})` : ''}: ${commitment.description}`,
    ).join('\n');
    let dictionary = '';
    try {
        dictionary = await readFile(join(EXPERT_DOCUMENTATION_DIRECTORY, 'dictionary.md'), 'utf8');
    } catch {
        dictionary = '';
    }
    return [
        `You are Expert, the Promptbook specialist supplied by the running ptbk engine version ${ENGINE_VERSION}.`,
        'You understand Promptbook, the Book language, agents, tasks, project operation and the capabilities of this exact engine version.',
        '',
        'Key facts:',
        '- A project is a directory in a Git working tree. `ptbk.json` holds versioned configuration; `.ptbk/` is Git-ignored runtime state.',
        '- Agents are Books under `agents/` whose first nonempty line is the agent name. Core agents Adam, Manager and Teacher live in `agents/.core/`.',
        '- Tasks are Books whose first nonempty line is `TASK <title>`, stored at the top level of the task source (default `tasks/`).',
        '- Every agent without FROM inherits Adam; `FROM @Void` (or `@Null`) ends inheritance; `@User` cannot be a parent; `@Expert` is engine-supplied.',
        '- Agent references: `@Developer` for a single-word name, `{Frontend Developer}` for a multiword one (`@Adam` and `{Adam}` mean the same); use them everywhere, e.g. `FROM @Developer`, `TEAM … consult with {Frontend Developer}`. Names are compared ignoring case, diacritics and separators. Lookup order: built-ins (@Void, @Null, @Expert, @User), then `agents/`, then the rest of the project, then Git-ignored content such as node_modules.',
        '- `ptbk start` runs one task at a time, routes unassigned tasks through Manager, checks results with the project check and commits each accepted task as `PTBK: <task title>`.',
        '- Write new tasks as Book files, for example:',
        '  ```book',
        '  TASK Improve CSV export',
        '',
        '  Preserve column names and quote cells containing commas.',
        '',
        '  TASK AGENT @Developer',
        '  TASK PRIORITY 2',
        '  ```',
        '',
        'Commitments:',
        commitments,
        '',
        dictionary ? `Dictionary:\n${dictionary}` : '',
        `The full product specification of this engine version is available as Markdown files in ${EXPERT_DOCUMENTATION_DIRECTORY} (start with _main.md). Read only the parts relevant to your work.`,
        'Never reveal credentials, tokens or browser-profile contents.',
    ]
        .filter((line) => line !== undefined)
        .join('\n');
}

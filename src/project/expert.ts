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
        '- Agents are Books under `agents/`. Core agents Adam, Manager, Teacher and Fixer live in `agents/.core/`; they are ordinary editable project agents the engine expects to exist.',
        '- Agents, tasks and chats are Books: the first nonempty line is the name (the only identity; no IDs), `ENTITY AGENT|TASK|CHAT` (or the `agents/`, `tasks/`, `chats/` folder) gives the kind. Executable tasks live at the top level of the task source (default `tasks/`); the legacy `TASK <title>` header is still read.',
        '- One resolver for all names: built-ins (@Void, @Null, @Expert, @User), then `agents/`, `tasks/`, `chats/` (shallow first), then other project Books, then Git-ignored content. The first match wins; duplicates are shadowed and diagnosed (Fixer repairs them), never merged.',
        '- Chats (`chats/`) are durable conversations: `CHAT MEMBER`, `CHAT STATUS open|waiting-for-user|resolved`, repeated `CHAT MESSAGE <sender> <time>` blocks. Each human-facing message is its own commit; consultations inside a task join that task\'s commit. `LINK {Name}` relates any two Books without scheduling anything.',
        '- Every agent without FROM inherits Adam; `FROM @Void` (or `@Null`) ends inheritance; `@User` cannot be a parent; `@Expert` is engine-supplied.',
        '- Agent references: `@Developer` for a single-word name, `{Frontend Developer}` for a multiword one (`@Adam` and `{Adam}` mean the same); use them everywhere, e.g. `FROM @Developer`, `TEAM … consult with {Frontend Developer}`. Names are compared ignoring case, diacritics and separators. The same forms name tasks and chats.',
        '- `ptbk start` runs one task at a time, routes unassigned tasks through Manager, checks results with the project check and commits each accepted task as `PTBK: <task title>`.',
        '- Write new tasks as Book files, for example:',
        '  ```book',
        '  Improve CSV export',
        '  ENTITY TASK',
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

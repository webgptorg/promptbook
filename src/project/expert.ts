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
        '- Agents are Books under `agents/`. Core agents Adam, Manager, Teacher, Fixer and Chatter live in `agents/.core/`; they are ordinary editable project agents the engine expects to exist. Chatter is the default partner of new human chats and consults its TEAM for specialist questions.',
        '- Agents, tasks and chats are Books with one grammar: every Book starts with exactly one `AGENT <name>`, `TASK <name>` or `CHAT <name>` declaration; its content is the name (the only identity; no IDs), and the keyword is the kind. The folder never supplies the kind. Executable tasks live at the top level of the task source (default `tasks/`).',
        '- A commitment is a line-initial complete uppercase keyword (at least three letters, e.g. `TASK DEPENDS ON`) followed by its content until the next commitment. A name or content must not start with an all-uppercase word right after the keyword (`AGENT Ceo`, not `AGENT CEO`). Descriptions go under commitments such as GOAL, PERSONA or NOTE; text directly under the declaration is invalid. Lines that would look like commitments can be kept literal with a leading backslash or a fenced block.',
        '- Plain name lines and `ENTITY …` are former syntax: such Books are diagnosed and not used until converted explicitly with `ptbk migrate`.',
        '- New tasks and chats get generated names: a readable title plus the creation date/time (e.g. `TASK Improve CSV export — 2026-10-18 01:25:00`), distinct from every other name. Reference the full saved name.',
        '- One resolver for all names: built-ins (@Void, @Null, @Expert, @User), then `agents/`, `tasks/`, `chats/` (shallow first), then other project Books, then Git-ignored content. The first match wins; duplicates are shadowed and diagnosed (Fixer repairs them), never merged.',
        '- Chats (`chats/`) are durable conversations: `CHAT MEMBER`, `CHAT STATUS open|waiting-for-user|resolved`, repeated `CHAT MESSAGE <sender> <time>` blocks. Each human-facing message is its own commit; consultations inside a task join that task\'s commit. `LINK {{Name}}` relates any two Books without scheduling anything.',
        '- Every agent without FROM inherits Adam; `FROM @Void` (or `@Null`) ends inheritance; `@User` cannot be a parent; `@Expert` is engine-supplied.',
        '- References: `@Developer` for a single-word name, `{{Frontend Developer}}` for any name (`@Adam` and `{{Adam}}` mean the same; the older `{Adam}` still reads). Use them everywhere, e.g. `FROM @Developer`, `TEAM … consult with {{Frontend Developer}}`. Names are compared ignoring case, diacritics and separators. The same forms name tasks and chats.',
        '- `ptbk start` runs one task at a time, routes unassigned tasks through Manager, checks results with the project check and commits each accepted task as `PTBK: <task name>`.',
        '- Book examples:',
        '  ```book',
        '  AGENT Frontend Developer',
        '  FROM @Developer',
        '  PERSONA You build accessible user interfaces.',
        '  ```',
        '  ```book',
        '  TASK Improve CSV export — 2026-10-18 01:25:00',
        '  GOAL Preserve column names and quote cells containing commas.',
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

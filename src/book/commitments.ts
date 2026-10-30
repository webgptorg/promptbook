/**
 * Which document kinds a commitment belongs to (`both` = agents and tasks, `chat` = chats, `any` = every kind).
 *
 * @private Book language
 */
export type CommitmentScope = 'agent' | 'task' | 'both' | 'chat' | 'any';

/**
 * How a commitment's content is interpreted.
 *
 * - `declaration`: the opening type-and-name commitment (`AGENT`, `TASK`, `CHAT`); its content is the name
 * - `instruction`: repeatable multi-line natural-language content
 * - `control`: single-value control field (its value is the first line)
 * - `repeatable-control`: control field that may appear several times (e.g. `TASK DONE`, `TASK DEPENDS ON`)
 * - `flag`: marker without required content (e.g. `CLOSED`)
 * - `historical`: former syntax kept only to diagnose and convert old sources (`ENTITY`)
 *
 * @private Book language
 */
export type CommitmentKind = 'declaration' | 'instruction' | 'control' | 'repeatable-control' | 'flag' | 'historical';

/**
 * Definition of one canonical commitment with its aliases.
 *
 * @private Book language
 */
export type CommitmentDefinition = {
    /** Canonical uppercase keyword (may contain spaces). */
    readonly keyword: string;
    /** Alias keywords sharing the semantics. */
    readonly aliases: readonly string[];
    /** Document kinds accepting the commitment. */
    readonly scope: CommitmentScope;
    /** Content interpretation. */
    readonly kind: CommitmentKind;
    /** Short description used by help, Expert and diagnostics. */
    readonly description: string;
    /** Not a documented commitment: an unknown complete keyword preserved for round-tripping and diagnosed. */
    readonly unknown?: boolean;
};

/**
 * Values of `TASK PURPOSE` (written uppercase, so each value is part of the complete keyword).
 *
 * @private Book language
 */
export const TASK_PURPOSE_VALUES = ['CONTENT', 'SYSTEM', 'UNDEFINED'] as const;

/**
 * Every recognized commitment.
 *
 * @private Book language
 */
export const COMMITMENTS: readonly CommitmentDefinition[] = [
    { keyword: 'AGENT', aliases: [], scope: 'agent', kind: 'declaration', description: 'Opening declaration of an agent: `AGENT <name>`.' },
    { keyword: 'TASK', aliases: [], scope: 'task', kind: 'declaration', description: 'Opening declaration of a task: `TASK <name>`.' },
    { keyword: 'CHAT', aliases: [], scope: 'chat', kind: 'declaration', description: 'Opening declaration of a chat: `CHAT <name>`.' },
    { keyword: 'ENTITY', aliases: ['ENTITY AGENT', 'ENTITY TASK', 'ENTITY CHAT'], scope: 'any', kind: 'historical', description: 'Former kind declaration after a plain name line; convert with `ptbk migrate`.' },
    { keyword: 'LINK', aliases: ['LINKS'], scope: 'any', kind: 'repeatable-control', description: 'Directed reference to another agent, task or chat (no scheduling or authority).' },
    { keyword: 'CHAT MEMBER', aliases: [], scope: 'chat', kind: 'repeatable-control', description: 'Participant of a chat (`@User` and one or more agents, the first being the main agent; or the two agents of a consultation). A joining agent is appended before its first message.' },
    { keyword: 'CHAT MESSAGE', aliases: [], scope: 'chat', kind: 'instruction', description: 'One durable message: `CHAT MESSAGE <sender> <timestamp> [progress|final]` followed by its text.' },
    { keyword: 'CHAT TITLE', aliases: [], scope: 'chat', kind: 'repeatable-control', description: 'Evolving human-facing topic title (the latest wins); never renames the chat, whose `CHAT` name stays its identity.' },
    { keyword: 'CHAT STATUS', aliases: [], scope: 'chat', kind: 'repeatable-control', description: '`open`, `waiting-for-user` or `resolved`, appended at each actual transition (the last valid one wins; without one a chat is open).' },
    { keyword: 'PERSONA', aliases: ['PERSONAE'], scope: 'agent', kind: 'instruction', description: 'Role and identity of the agent.' },
    { keyword: 'GOAL', aliases: ['GOALS'], scope: 'both', kind: 'instruction', description: "An agent's lasting objective (also used for goal discovery), or a task's bounded work and intended result." },
    { keyword: 'RULE', aliases: ['RULES'], scope: 'both', kind: 'instruction', description: 'Behavioral constraint (task rules apply only to that task).' },
    { keyword: 'KNOWLEDGE', aliases: [], scope: 'agent', kind: 'instruction', description: 'Inline knowledge or a reference to relevant material.' },
    { keyword: 'STYLE', aliases: ['STYLES'], scope: 'agent', kind: 'instruction', description: 'Style of communication or output.' },
    { keyword: 'LANGUAGE', aliases: ['LANGUAGES'], scope: 'agent', kind: 'instruction', description: 'Language(s) of responses.' },
    { keyword: 'WRITING SAMPLE', aliases: [], scope: 'agent', kind: 'instruction', description: 'Example of the desired writing style.' },
    { keyword: 'WRITING RULES', aliases: ['WRITING RULE'], scope: 'agent', kind: 'instruction', description: 'Specific writing conventions.' },
    { keyword: 'SAMPLE', aliases: ['EXAMPLE'], scope: 'agent', kind: 'instruction', description: 'Representative interaction or output.' },
    { keyword: 'FORMAT', aliases: ['FORMATS'], scope: 'agent', kind: 'instruction', description: 'Requested output format.' },
    { keyword: 'TEMPLATE', aliases: ['TEMPLATES'], scope: 'agent', kind: 'instruction', description: 'Reusable response/output pattern.' },
    { keyword: 'FROM', aliases: [], scope: 'agent', kind: 'control', description: 'Single inheritance parent (default Adam).' },
    { keyword: 'IMPORT', aliases: ['IMPORTS'], scope: 'agent', kind: 'repeatable-control', description: 'In-place inclusion of another agent\'s instructions.' },
    {
        keyword: 'MODEL',
        aliases: ['MODELS'],
        scope: 'any',
        kind: 'instruction',
        description: 'Allowed execution combinations (`harness=… model=… thinking=… provider=… origin=… runtime=…`; fields on one line apply together, lines are alternatives) of an agent, task or chat, independent of the tool/account.',
    },
    { keyword: 'ACTION', aliases: ['ACTIONS'], scope: 'agent', kind: 'instruction', description: 'Actions/tools the role intends to use.' },
    { keyword: 'TEAM', aliases: [], scope: 'agent', kind: 'instruction', description: 'Whom the agent may consult and when.' },
    { keyword: 'OPEN', aliases: [], scope: 'agent', kind: 'instruction', description: 'Permits learning, optionally with natural-language limits.' },
    { keyword: 'CLOSED', aliases: [], scope: 'agent', kind: 'flag', description: 'Prohibits automatic learning changes.' },
    { keyword: 'NOTE', aliases: ['NOTES', 'COMMENT', 'NONCE', 'TODO'], scope: 'any', kind: 'instruction', description: 'Non-executable commentary.' },
    { keyword: 'DELETE', aliases: ['CANCEL', 'DISCARD', 'REMOVE'], scope: 'agent', kind: 'instruction', description: 'Withdraws an identified earlier commitment.' },
    { keyword: 'DICTIONARY', aliases: [], scope: 'agent', kind: 'instruction', description: 'Terminology for the role\'s work.' },
    { keyword: 'TASK ID', aliases: [], scope: 'task', kind: 'control', description: 'Legacy historical metadata; never identity (the task name is).' },
    { keyword: 'TASK AGENT', aliases: [], scope: 'task', kind: 'control', description: 'Responsible agent.' },
    { keyword: 'TASK HARNESS', aliases: [], scope: 'task', kind: 'control', description: 'Former harness requirement, replaced by `MODEL harness=…` (honored and diagnosed until converted).' },
    { keyword: 'TASK MODEL', aliases: [], scope: 'task', kind: 'control', description: 'Former model requirement, replaced by `MODEL model=…` (honored and diagnosed until converted).' },
    { keyword: 'TASK THINKING LEVEL', aliases: [], scope: 'task', kind: 'control', description: 'Former thinking requirement, replaced by `MODEL thinking=…` (honored and diagnosed until converted).' },
    { keyword: 'TASK PRIORITY', aliases: [], scope: 'task', kind: 'control', description: 'Nonnegative number or textual importance; higher first.' },
    { keyword: 'TASK AFTER', aliases: [], scope: 'task', kind: 'control', description: 'Inclusive earliest permitted start.' },
    { keyword: 'TASK DUE DATE', aliases: [], scope: 'task', kind: 'control', description: 'Desired completion deadline (not a start condition).' },
    { keyword: 'TASK DONE', aliases: [], scope: 'task', kind: 'repeatable-control', description: 'Completion stamp with explicit timezone.' },
    { keyword: 'TASK STATUS', aliases: [], scope: 'task', kind: 'control', description: '`todo`, `not-ready`, `failed` or `retired`.' },
    { keyword: 'TASK REPEAT', aliases: [], scope: 'task', kind: 'control', description: 'Positive fixed recurrence interval.' },
    { keyword: 'TASK DEPENDS ON', aliases: [], scope: 'task', kind: 'repeatable-control', description: 'Prerequisite task references.' },
    { keyword: 'TASK PARENT', aliases: [], scope: 'task', kind: 'control', description: 'Parent task reference (no implied ordering).' },
    { keyword: 'TASK RUNNER', aliases: [], scope: 'task', kind: 'repeatable-control', description: 'Opaque any-of routing selectors from Markdown.' },
    { keyword: 'TASK NOTE', aliases: [], scope: 'task', kind: 'instruction', description: 'Explanatory task metadata.' },
    { keyword: 'TASK ORIGIN', aliases: [], scope: 'task', kind: 'control', description: 'Provenance of the task.' },
    {
        keyword: 'TASK PURPOSE',
        // The uppercase values join the keyword under the boundary rule, so each complete spelling is an alias.
        aliases: TASK_PURPOSE_VALUES.map((value) => `TASK PURPOSE ${value}`),
        scope: 'task',
        kind: 'repeatable-control',
        description: 'Project-relative purpose `TASK PURPOSE CONTENT|SYSTEM|UNDEFINED`, appended at each actual change (earlier values stay in the Book; the last valid one is effective). Presentation only: no priority, permission or executor.',
    },
];

/**
 * Lookup from every accepted keyword spelling to its definition.
 */
const KEYWORD_LOOKUP: ReadonlyMap<string, CommitmentDefinition> = new Map([
    ...COMMITMENTS.flatMap((definition) => [definition.keyword, ...definition.aliases].map((keyword) => [keyword, definition] as const)),
    // `DELETE RULE …` is one complete keyword: the withdrawal names the kind of the commitment it withdraws.
    ...COMMITMENTS.filter((definition) => definition.kind === 'instruction' && definition.keyword !== 'DELETE').flatMap((target) =>
        ['DELETE', 'CANCEL', 'DISCARD', 'REMOVE'].flatMap((withdraw) => [target.keyword, ...target.aliases].map((keyword) => [`${withdraw} ${keyword}`, COMMITMENTS.find((definition) => definition.keyword === 'DELETE')!] as const)),
    ),
]);

/**
 * Every accepted spelling, including aliases and compound withdrawals, for editors using the shared vocabulary.
 *
 * @private Book language
 */
export function commitmentKeywords(): string[] {
    return [...KEYWORD_LOOKUP.keys()];
}

/**
 * The commitment kind a compound withdrawal names (`DELETE RULE` → `RULE`), if any.
 *
 * @private Book language
 */
export function withdrawnKeyword(written: string): string | undefined {
    const [, ...rest] = written.trim().split(/\s+/);
    if (!rest.length) return undefined;
    const target = KEYWORD_LOOKUP.get(rest.join(' '));
    return target && target.keyword !== 'DELETE' ? target.keyword : undefined;
}

/**
 * One all-uppercase word of a commitment keyword (letters only; digits, punctuation or lowercase begin content).
 */
const KEYWORD_WORD = /^\p{Lu}[\p{Lu}\p{M}]*$/u;

/**
 * Fewest letters a complete keyword needs (so `A`, `I` or `AI` starting prose never begin a commitment).
 */
const MIN_KEYWORD_LETTERS = 3;

/**
 * A commitment keyword found at the beginning of a line.
 *
 * @private Book language
 */
export type KeywordMatch = {
    /** Definition of the complete keyword (a synthetic `unknown` definition for undocumented keywords). */
    readonly definition: CommitmentDefinition;
    /** Keyword as written (complete uppercase word sequence). */
    readonly written: string;
    /** Content after the keyword on the same line (trimmed). */
    readonly content: string;
};

/**
 * Recognizes a commitment at the beginning of a line by the common boundary rule.
 *
 * The keyword is the maximal sequence of all-uppercase words at column zero, separated by spaces, with at least three
 * letters in total. A word containing lowercase letters, digits, punctuation or a reference begins the content; once
 * content begins, later uppercase words belong to it. The complete keyword is looked up as a whole: an unknown keyword
 * is never shortened to a known prefix (`TASK SOMETHING` is not `TASK`).
 *
 * @private Book language
 */
export function matchCommitmentKeyword(line: string): KeywordMatch | undefined {
    if (!/^\p{Lu}/u.test(line)) return undefined;
    const words: string[] = [];
    let offset = 0;
    for (const word of line.matchAll(/\S+/g)) {
        if (!KEYWORD_WORD.test(word[0])) break;
        words.push(word[0]);
        offset = word.index + word[0].length;
    }
    const keyword = words.join(' ');
    if (keyword.replace(/\s/g, '').length < MIN_KEYWORD_LETTERS) return undefined;
    const definition = KEYWORD_LOOKUP.get(keyword) ?? { keyword, aliases: [], scope: 'any', kind: 'instruction', description: 'Unknown commitment (preserved without effect).', unknown: true };
    return { definition, written: line.slice(0, offset), content: line.slice(offset).trim() };
}

/**
 * Whether a line would start a commitment (writers escape such lines in literal content).
 *
 * @private Book language
 */
export function startsCommitment(line: string): boolean {
    return matchCommitmentKeyword(line) !== undefined;
}

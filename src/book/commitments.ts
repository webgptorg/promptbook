/**
 * Which document kinds a commitment belongs to.
 *
 * @private Book language
 */
export type CommitmentScope = 'agent' | 'task' | 'both';

/**
 * How a commitment's content is interpreted.
 *
 * - `instruction`: repeatable multi-line natural-language content
 * - `control`: single-value control field (its value is the first line)
 * - `repeatable-control`: control field that may appear several times (e.g. `TASK DONE`, `TASK DEPENDS ON`)
 * - `flag`: marker without required content (e.g. `CLOSED`)
 *
 * @private Book language
 */
export type CommitmentKind = 'instruction' | 'control' | 'repeatable-control' | 'flag';

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
};

/**
 * Every recognized commitment.
 *
 * @private Book language
 */
export const COMMITMENTS: readonly CommitmentDefinition[] = [
    { keyword: 'PERSONA', aliases: ['PERSONAE'], scope: 'agent', kind: 'instruction', description: 'Role and identity of the agent.' },
    { keyword: 'GOAL', aliases: ['GOALS'], scope: 'agent', kind: 'instruction', description: 'Lasting objective, also used for goal discovery.' },
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
    { keyword: 'MODEL', aliases: ['MODELS'], scope: 'agent', kind: 'instruction', description: 'Model preference or requirement of the agent.' },
    { keyword: 'ACTION', aliases: ['ACTIONS'], scope: 'agent', kind: 'instruction', description: 'Actions/tools the role intends to use.' },
    { keyword: 'TEAM', aliases: [], scope: 'agent', kind: 'instruction', description: 'Whom the agent may consult and when.' },
    { keyword: 'OPEN', aliases: [], scope: 'agent', kind: 'instruction', description: 'Permits learning, optionally with natural-language limits.' },
    { keyword: 'CLOSED', aliases: [], scope: 'agent', kind: 'flag', description: 'Prohibits automatic learning changes.' },
    { keyword: 'NOTE', aliases: ['NOTES', 'COMMENT', 'NONCE', 'TODO'], scope: 'both', kind: 'instruction', description: 'Non-executable commentary.' },
    { keyword: 'DELETE', aliases: ['CANCEL', 'DISCARD', 'REMOVE'], scope: 'agent', kind: 'instruction', description: 'Withdraws an identified earlier commitment.' },
    { keyword: 'DICTIONARY', aliases: [], scope: 'agent', kind: 'instruction', description: 'Terminology for the role\'s work.' },
    { keyword: 'TASK', aliases: [], scope: 'task', kind: 'control', description: 'Declares a task: `TASK <title>` on the first nonempty line.' },
    { keyword: 'TASK ID', aliases: [], scope: 'task', kind: 'control', description: 'Stable reference key, distinct from the title.' },
    { keyword: 'TASK AGENT', aliases: [], scope: 'task', kind: 'control', description: 'Responsible agent.' },
    { keyword: 'TASK HARNESS', aliases: [], scope: 'task', kind: 'control', description: 'Required execution harness.' },
    { keyword: 'TASK MODEL', aliases: [], scope: 'task', kind: 'control', description: 'Required model.' },
    { keyword: 'TASK THINKING LEVEL', aliases: [], scope: 'task', kind: 'control', description: 'Required reasoning/effort setting.' },
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
];

/**
 * Lookup from every accepted keyword spelling to its definition.
 */
const KEYWORD_LOOKUP: ReadonlyMap<string, CommitmentDefinition> = new Map(
    COMMITMENTS.flatMap((definition) => [definition.keyword, ...definition.aliases].map((keyword) => [keyword, definition] as const)),
);

/**
 * All keyword spellings, longest first (so `TASK AGENT` wins over `TASK`).
 */
const KEYWORDS_LONGEST_FIRST: readonly string[] = [...KEYWORD_LOOKUP.keys()].sort((a, b) => b.length - a.length);

/**
 * Recognizes a commitment at the beginning of a line.
 *
 * The keyword must be uppercase and complete: it is followed by whitespace or the end of the line.
 *
 * @private Book language
 */
export function matchCommitmentKeyword(line: string): { definition: CommitmentDefinition; written: string; content: string } | undefined {
    for (const keyword of KEYWORDS_LONGEST_FIRST) {
        if (!line.startsWith(keyword)) continue;
        const rest = line.slice(keyword.length);
        if (rest !== '' && !/^\s/.test(rest)) continue;
        return { definition: KEYWORD_LOOKUP.get(keyword)!, written: keyword, content: rest.trim() };
    }
    return undefined;
}


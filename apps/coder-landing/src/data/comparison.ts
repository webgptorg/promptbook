import { spaceTrim } from 'spacetrim';
import { UnexpectedError } from '@promptbook-source/errors/UnexpectedError';
import type { HarnessDefinition, HarnessName } from './harnessCatalog';
import { HARNESS_CATALOG } from './harnessCatalog';

/**
 * Name of the column of the comparison table which stands for `ptbk coder` itself.
 */
export const PTBK_CODER_COLUMN_NAME = 'ptbk-coder';

/**
 * Name of one harness which the comparison table puts next to `ptbk coder`.
 *
 * Note: Every compared solution is also a harness which `ptbk coder` can drive, so the names are
 *       taken from [`harnessCatalog`](./harnessCatalog.ts) instead of being repeated here.
 */
export type ComparedHarnessName = Extract<HarnessName, 'claude-code' | 'openai-codex' | 'opencode'>;

/**
 * Name of one column of the comparison table.
 */
export type ComparisonColumnName = typeof PTBK_CODER_COLUMN_NAME | ComparedHarnessName;

/**
 * How well one solution covers one capability on its own.
 *
 * - `built-in` — the solution provides the capability itself
 * - `do-it-yourself` — the capability is reachable, but you have to wire it up yourself
 * - `not-available` — the solution does not provide the capability at all
 */
export type ComparisonSupportLevel = 'built-in' | 'do-it-yourself' | 'not-available';

/**
 * Explanation of one support level, shown in the legend below the comparison table.
 */
export type ComparisonSupportLevelDefinition = {
    /**
     * Accessible label of the mark, read instead of the icon by screen readers
     */
    readonly label: string;

    /**
     * One-line explanation of the mark shown in the legend
     */
    readonly legend: string;
};

/**
 * All support levels, in the order in which they are explained in the legend below the table.
 */
export const COMPARISON_SUPPORT_LEVEL_NAMES: ReadonlyArray<ComparisonSupportLevel> = [
    'built-in',
    'do-it-yourself',
    'not-available',
];

/**
 * Explanation of every support level.
 */
export const COMPARISON_SUPPORT_LEVELS: Readonly<Record<ComparisonSupportLevel, ComparisonSupportLevelDefinition>> = {
    'built-in': {
        label: 'Built in',
        legend: 'Built in — one option or command away',
    },
    'do-it-yourself': {
        label: 'Do it yourself',
        legend: 'Reachable — but you script and maintain it yourself',
    },
    'not-available': {
        label: 'Not available',
        legend: 'Not provided by the tool',
    },
};

/**
 * One cell of the comparison table — how one solution covers one capability.
 */
export type ComparisonCellDefinition = {
    /**
     * Support level rendered as the mark of the cell
     */
    readonly level: ComparisonSupportLevel;

    /**
     * Few-word note shown under the mark, naming the option, command or workaround behind it
     */
    readonly note: string;
};

/**
 * One row of the comparison table — one capability compared across all solutions.
 */
export type ComparisonRowDefinition = {
    /**
     * Short name of the compared capability
     */
    readonly capability: string;

    /**
     * One-sentence explanation of what the capability means
     */
    readonly description: string;

    /**
     * Cell of every column of the table
     */
    readonly cells: Readonly<Record<ComparisonColumnName, ComparisonCellDefinition>>;
};

/**
 * One column of the comparison table.
 */
export type ComparisonColumnDefinition = {
    /**
     * Name of the column, used as the key into the cells of every row
     */
    readonly columnName: ComparisonColumnName;

    /**
     * Human-readable product name shown in the table head
     */
    readonly displayName: string;

    /**
     * Vendor of the product shown under its name
     */
    readonly vendorName: string;

    /**
     * Harness driven by `ptbk coder` in this column, or `null` for the `ptbk coder` column itself
     */
    readonly harness: HarnessDefinition | null;
};

/**
 * Harnesses compared with `ptbk coder`, in the order of the harness catalog.
 */
const COMPARED_HARNESS_NAMES: ReadonlyArray<ComparedHarnessName> = ['claude-code', 'openai-codex', 'opencode'];

/**
 * Builds the column of one compared harness from its catalog entry, so that no catalog value is duplicated.
 */
function createComparedHarnessColumn(harnessName: ComparedHarnessName): ComparisonColumnDefinition {
    const harness = HARNESS_CATALOG.find((catalogEntry) => catalogEntry.harnessName === harnessName);

    if (harness === undefined) {
        throw new UnexpectedError(
            spaceTrim(`
                Harness \`${harnessName}\` is compared with \`ptbk coder\` but it is missing in \`HARNESS_CATALOG\`.

                **Every compared solution must also be a harness** which \`ptbk coder\` can drive,
                add it back to \`harnessCatalog\` or remove it from \`ComparedHarnessName\`.
            `),
        );
    }

    return {
        columnName: harnessName,
        displayName: harness.displayName,
        vendorName: harness.vendorName,
        harness,
    };
}

/**
 * All columns of the comparison table, `ptbk coder` first.
 *
 * Note: Specified in [`specs/content/comparison-matrix.md`](../../specs/content/comparison-matrix.md)
 */
export const COMPARISON_COLUMNS: ReadonlyArray<ComparisonColumnDefinition> = [
    {
        columnName: PTBK_CODER_COLUMN_NAME,
        displayName: 'ptbk coder',
        vendorName: 'Promptbook',
        harness: null,
    },
    ...COMPARED_HARNESS_NAMES.map(createComparedHarnessColumn),
];

/**
 * All capabilities compared between `ptbk coder` and the coding agents it drives.
 *
 * Note: Every row is about **orchestration around a task**, never about how well an agent writes code,
 *       and is specified in [`specs/content/comparison-matrix.md`](../../specs/content/comparison-matrix.md)
 */
export const COMPARISON_ROWS: ReadonlyArray<ComparisonRowDefinition> = [
    {
        capability: 'Interactive coding session',
        description: 'Sit next to the agent in a terminal and steer a single task while it happens.',
        cells: {
            'ptbk-coder': { level: 'not-available', note: 'Drives the agents instead' },
            'claude-code': { level: 'built-in', note: 'Its home ground' },
            'openai-codex': { level: 'built-in', note: 'Its home ground' },
            opencode: { level: 'built-in', note: 'Its home ground' },
        },
    },
    {
        capability: 'A whole backlog in one run',
        description: 'Many tasks queued as markdown files and implemented one after another, unattended.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: 'The prompts/ queue' },
            'claude-code': { level: 'do-it-yourself', note: 'Script one session per task' },
            'openai-codex': { level: 'do-it-yourself', note: 'Script one session per task' },
            opencode: { level: 'do-it-yourself', note: 'Script one session per task' },
        },
    },
    {
        capability: 'Harness-agnostic',
        description: 'The same backlog and the same rules, whichever coding agent implements them.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: 'Six harnesses, one flag' },
            'claude-code': { level: 'not-available', note: 'Is one of the harnesses' },
            'openai-codex': { level: 'not-available', note: 'Is one of the harnesses' },
            opencode: { level: 'do-it-yourself', note: 'Any model, its own agent' },
        },
    },
    {
        capability: 'Several agents on one backlog',
        description: 'Run more harnesses and models at once, each taking its own slice of the queue.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: '--min-priority / --max-priority' },
            'claude-code': { level: 'not-available', note: 'No shared queue' },
            'openai-codex': { level: 'not-available', note: 'No shared queue' },
            opencode: { level: 'not-available', note: 'No shared queue' },
        },
    },
    {
        capability: 'Tests after every task',
        description: 'Your test command runs after each prompt and failures go back to the agent until it is green.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: '--test, retried until green' },
            'claude-code': { level: 'do-it-yourself', note: 'If asked, or via hooks' },
            'openai-codex': { level: 'do-it-yourself', note: 'If asked in the prompt' },
            opencode: { level: 'do-it-yourself', note: 'If asked in the prompt' },
        },
    },
    {
        capability: 'Tests before the first task',
        description: 'Failures which were already there are found before the queue starts — and repaired first.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: '--test-before yes-and-fix' },
            'claude-code': { level: 'not-available', note: 'Nothing runs before you' },
            'openai-codex': { level: 'not-available', note: 'Nothing runs before you' },
            opencode: { level: 'not-available', note: 'Nothing runs before you' },
        },
    },
    {
        capability: 'Commits as its own author',
        description: 'Each verified round is committed under a separate agent git identity, optionally GPG-signed.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: 'Dedicated agent identity' },
            'claude-code': { level: 'do-it-yourself', note: 'Commits as you' },
            'openai-codex': { level: 'do-it-yourself', note: 'Commits as you' },
            opencode: { level: 'do-it-yourself', note: 'Commits as you' },
        },
    },
    {
        capability: 'Pull and push around each task',
        description: 'A queue running for hours stays in sync with the remote without anybody watching it.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: '--auto-pull --auto-push' },
            'claude-code': { level: 'do-it-yourself', note: 'When you ask for it' },
            'openai-codex': { level: 'do-it-yourself', note: 'When you ask for it' },
            opencode: { level: 'do-it-yourself', note: 'When you ask for it' },
        },
    },
    {
        capability: 'One worktree per task',
        description: 'Every prompt is implemented in its own temporary git worktree and merged back once verified.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: '--isolate' },
            'claude-code': { level: 'do-it-yourself', note: 'Set up worktrees yourself' },
            'openai-codex': { level: 'do-it-yourself', note: 'Set up worktrees yourself' },
            opencode: { level: 'do-it-yourself', note: 'Set up worktrees yourself' },
        },
    },
    {
        capability: 'Board over the backlog',
        description: 'A Trello-style kanban of the prompt files, editable in the browser while the queue runs.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: 'ptbk coder server' },
            'claude-code': { level: 'not-available', note: 'No backlog to show' },
            'openai-codex': { level: 'not-available', note: 'No backlog to show' },
            opencode: { level: 'not-available', note: 'No backlog to show' },
        },
    },
    {
        capability: 'PRD and code in one commit',
        description:
            'A completed PRD and its code changes are committed together by default, so a revert takes both the implementation and its done state back.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: 'PRD status + code commit' },
            'claude-code': { level: 'do-it-yourself', note: 'Local session history' },
            'openai-codex': { level: 'do-it-yourself', note: 'Local session history' },
            opencode: { level: 'do-it-yourself', note: 'Local session history' },
        },
    },
    {
        capability: 'Pacing for quota windows',
        description: 'Wall-clock waits between prompts and a cool-down retry after an error keep a long queue alive.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: '--wait-between-prompts' },
            'claude-code': { level: 'not-available', note: 'Pace it by hand' },
            'openai-codex': { level: 'not-available', note: 'Pace it by hand' },
            opencode: { level: 'not-available', note: 'Pace it by hand' },
        },
    },
    {
        capability: 'Preflight check of a harness',
        description:
            'One tiny dummy prompt reports the answer, the response time and the usage — and warms the quota window.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: 'ptbk coder ping' },
            'claude-code': { level: 'do-it-yourself', note: 'Check limits in the session' },
            'openai-codex': { level: 'do-it-yourself', note: 'Check limits in the session' },
            opencode: { level: 'do-it-yourself', note: 'Depends on the provider' },
        },
    },
    {
        capability: 'Writes the backlog for you',
        description: 'Boilerplates, refactor candidates and one-line ideas become ready-to-run prompt files.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: 'ptbk coder generate-boilerplates' },
            'claude-code': { level: 'do-it-yourself', note: 'Ask for it in a session' },
            'openai-codex': { level: 'do-it-yourself', note: 'Ask for it in a session' },
            opencode: { level: 'do-it-yourself', note: 'Ask for it in a session' },
        },
    },
    {
        capability: 'Human in the loop',
        description: 'Confirm each task, pause a running queue, or end it after the task which is running now.',
        cells: {
            'ptbk-coder': { level: 'built-in', note: '--no-auto, P, X' },
            'claude-code': { level: 'built-in', note: 'You are in the session' },
            'openai-codex': { level: 'built-in', note: 'You are in the session' },
            opencode: { level: 'built-in', note: 'You are in the session' },
        },
    },
];

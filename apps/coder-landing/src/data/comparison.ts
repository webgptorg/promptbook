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
 * - `built-in` — the solution does the whole thing for you
 * - `do-it-yourself` — the solution gives you the pieces and you wire them together
 * - `not-available` — the solution has no such concept, you would be writing the orchestrator
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
        legend: 'Built in, one option or command away',
    },
    'do-it-yourself': {
        label: 'Do it yourself',
        legend: 'Reachable, but you script and maintain it yourself',
    },
    'not-available': {
        label: 'Not available',
        legend: 'No such concept in the tool',
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
 *
 * Note: The compared harnesses behave the same in almost every row, so one shared claim is written
 *       for all of them and only the harnesses which really differ are listed in `harnessCellOverrides`
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
     * How `ptbk coder` itself covers the capability
     */
    readonly ptbkCoderCell: ComparisonCellDefinition;

    /**
     * How every compared harness covers the capability, unless it is listed in `harnessCellOverrides`
     */
    readonly harnessCell: ComparisonCellDefinition;

    /**
     * Harnesses which cover the capability differently from `harnessCell`
     */
    readonly harnessCellOverrides?: Readonly<Partial<Record<ComparedHarnessName, ComparisonCellDefinition>>>;
};

/**
 * Reads what one compared harness claims in one row, applying its override over the shared claim.
 */
export function resolveComparisonHarnessCell(
    row: ComparisonRowDefinition,
    harnessName: ComparedHarnessName,
): ComparisonCellDefinition {
    return row.harnessCellOverrides?.[harnessName] ?? row.harnessCell;
}

/**
 * One column of the comparison table.
 */
export type ComparisonColumnDefinition = {
    /**
     * Name of the column, identifying which cells of a row belong to it
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
export const COMPARED_HARNESS_NAMES: ReadonlyArray<ComparedHarnessName> = ['claude-code', 'openai-codex', 'opencode'];

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
        capability: 'One task, side by side',
        description: 'Sit in the terminal with the agent and steer a single task while it happens.',
        ptbkCoderCell: { level: 'not-available', note: 'It drives them instead' },
        harnessCell: { level: 'built-in', note: 'What they are built for' },
    },
    {
        capability: 'The whole backlog, unattended',
        description: 'Task files go through the agent one after another: implement, verify, commit, next one.',
        ptbkCoderCell: { level: 'built-in', note: 'ptbk coder run' },
        harnessCell: { level: 'do-it-yourself', note: 'Script one session per task' },
    },
    {
        capability: 'Several agents on one backlog',
        description: 'Run more harnesses and models at once, each taking its own slice of the queue.',
        ptbkCoderCell: { level: 'built-in', note: '--min-priority --max-priority' },
        harnessCell: { level: 'not-available', note: 'No shared queue' },
    },
    {
        capability: 'The same agent on another vendor',
        description: 'The queue and the .book behavior move to a different harness or model without a rewrite.',
        ptbkCoderCell: { level: 'built-in', note: '--harness' },
        harnessCell: { level: 'not-available', note: 'One of the harnesses' },
        harnessCellOverrides: {
            opencode: { level: 'do-it-yourself', note: 'Any provider, your config' },
        },
    },
    {
        capability: 'Your tests gate every task',
        description:
            'Tests run before the queue starts and after every task, and failures go back to the agent until it is green.',
        ptbkCoderCell: { level: 'built-in', note: '--test --test-before' },
        harnessCell: { level: 'do-it-yourself', note: 'Ask for it, or wire a hook' },
    },
    {
        capability: 'Done state committed with the code',
        description:
            'The finished [x] lands in the same commit as the work it describes, so reverting takes both back.',
        ptbkCoderCell: { level: 'built-in', note: 'In every commit' },
        harnessCell: { level: 'do-it-yourself', note: 'Track it by hand' },
    },
    {
        capability: 'Git kept in order around each task',
        description:
            'Commits under the agent git identity, a pull before and a push after, and one throwaway worktree per task.',
        ptbkCoderCell: { level: 'built-in', note: '--auto-pull --auto-push --isolate' },
        harnessCell: { level: 'do-it-yourself', note: 'It commits as you, when asked' },
    },
    {
        capability: 'Long runs that outlast a quota window',
        description:
            'Pacing between tasks, a cool-down retry after an error, and a ping that keeps the quota window refreshing.',
        ptbkCoderCell: { level: 'built-in', note: '--wait-between-prompts' },
        harnessCell: { level: 'not-available', note: 'No queue to pace' },
    },
    {
        capability: 'A backlog you can watch and refill',
        description:
            'A kanban board over the prompt files while the queue runs, with commands that write new ones and archive the finished.',
        ptbkCoderCell: { level: 'built-in', note: 'ptbk coder server' },
        harnessCell: { level: 'not-available', note: 'No backlog to show' },
    },
];

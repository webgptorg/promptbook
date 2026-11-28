import type {
    ComparedHarnessName,
    ComparisonCellDefinition,
    ComparisonColumnName,
    ComparisonRowDefinition,
} from '@/data/comparison';
import { COMPARED_HARNESS_NAMES, PTBK_CODER_COLUMN_NAME, resolveComparisonHarnessCell } from '@/data/comparison';

/**
 * One drawn cell of the comparison table, covering every neighbouring column which makes the same claim.
 */
export type ComparisonCellGroup = {
    /**
     * Columns covered by the cell, in the order of the table head
     */
    readonly columnNames: ReadonlyArray<ComparisonColumnName>;

    /**
     * Claim shared by all of those columns
     */
    readonly cell: ComparisonCellDefinition;
};

/**
 * Decides whether two claims are worth drawing twice.
 */
function isSameComparisonCell(one: ComparisonCellDefinition, other: ComparisonCellDefinition): boolean {
    return one.level === other.level && one.note === other.note;
}

/**
 * Merges the neighbouring harness columns which claim exactly the same thing into single cells.
 */
function groupComparedHarnessCells(row: ComparisonRowDefinition): ReadonlyArray<ComparisonCellGroup> {
    const groups: Array<{
        readonly columnNames: Array<ComparedHarnessName>;
        readonly cell: ComparisonCellDefinition;
    }> = [];

    for (const harnessName of COMPARED_HARNESS_NAMES) {
        const cell = resolveComparisonHarnessCell(row, harnessName);
        const previousGroup = groups.at(-1);

        if (previousGroup !== undefined && isSameComparisonCell(previousGroup.cell, cell)) {
            previousGroup.columnNames.push(harnessName);
            continue;
        }

        groups.push({ columnNames: [harnessName], cell });
    }

    return groups;
}

/**
 * Lays one row of the comparison table out into the cells to draw.
 *
 * The `ptbk coder` column always stands on its own, because it is the column the table is about.
 * The compared harnesses agree in almost every row, so their equal cells are drawn once across all
 * the columns they cover, which leaves the rows where they really differ as the ones that stand out.
 *
 * Note: Specified in [`specs/sections/comparison.md`](../../../specs/sections/comparison.md)
 */
export function resolveComparisonRowCellGroups(row: ComparisonRowDefinition): ReadonlyArray<ComparisonCellGroup> {
    return [{ columnNames: [PTBK_CODER_COLUMN_NAME], cell: row.ptbkCoderCell }, ...groupComparedHarnessCells(row)];
}

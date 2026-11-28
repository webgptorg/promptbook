import { resolveNextAdminTableSortState, sortAdminTableRows } from './adminTableSorting';

/**
 * Test row used by the admin table sorting utility coverage.
 *
 * @private test helper
 */
type SortableTestRow = {
    readonly label: string;
    readonly score: number | null;
};

describe('adminTableSorting', () => {
    it('toggles the current sort direction', () => {
        expect(
            resolveNextAdminTableSortState({
                currentSortBy: 'label',
                currentSortOrder: 'asc',
                nextSortBy: 'label',
            }),
        ).toEqual({
            sortBy: 'label',
            sortOrder: 'desc',
        });
    });

    it('uses the field default when switching columns', () => {
        expect(
            resolveNextAdminTableSortState({
                currentSortBy: 'label',
                currentSortOrder: 'asc',
                nextSortBy: 'score',
                resolveDefaultSortOrder: (sortBy) => (sortBy === 'score' ? 'desc' : 'asc'),
            }),
        ).toEqual({
            sortBy: 'score',
            sortOrder: 'desc',
        });
    });

    it('sorts rows by numeric values while keeping missing values last', () => {
        const rows: SortableTestRow[] = [
            { label: 'Empty', score: null },
            { label: 'Low', score: 1 },
            { label: 'High', score: 9 },
        ];

        const sortedRows = sortAdminTableRows({
            rows,
            sortBy: 'score',
            sortOrder: 'desc',
            resolveSortValue: (row, sortBy) => row[sortBy],
        });

        expect(sortedRows.map((row) => row.label)).toEqual(['High', 'Low', 'Empty']);
    });

    it('sorts text values with natural numeric order', () => {
        const rows: SortableTestRow[] = [
            { label: 'Agent 10', score: 10 },
            { label: 'Agent 2', score: 2 },
            { label: 'Agent 1', score: 1 },
        ];

        const sortedRows = sortAdminTableRows({
            rows,
            sortBy: 'label',
            sortOrder: 'asc',
            resolveSortValue: (row, sortBy) => row[sortBy],
        });

        expect(sortedRows.map((row) => row.label)).toEqual(['Agent 1', 'Agent 2', 'Agent 10']);
    });
});

'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * Sort direction supported by admin tables.
 *
 * @private internal admin table utility
 */
export type AdminTableSortOrder = 'asc' | 'desc';

/**
 * Sort state shared by admin table controls.
 *
 * @private internal admin table utility
 */
export type AdminTableSortState<TSortField extends string> = {
    readonly sortBy: TSortField;
    readonly sortOrder: AdminTableSortOrder;
};

/**
 * Values that can be compared by the generic admin table sorter.
 *
 * @private internal admin table utility
 */
export type AdminTableSortableValue = string | number | boolean | Date | null | undefined;

/**
 * Resolves the comparable value for one row and active sort field.
 *
 * @private internal admin table utility
 */
export type AdminTableSortableValueResolver<TRow, TSortField extends string> = (
    row: TRow,
    sortBy: TSortField,
) => AdminTableSortableValue;

/**
 * Resolves the default direction when a user switches to another sort field.
 *
 * @private internal admin table utility
 */
export type AdminTableDefaultSortOrderResolver<TSortField extends string> = (
    sortBy: TSortField,
) => AdminTableSortOrder;

/**
 * Default direction for newly selected columns.
 *
 * @private internal admin table utility
 */
const DEFAULT_ADMIN_TABLE_SORT_ORDER: AdminTableSortOrder = 'asc';

/**
 * Collator used for human-friendly text sorting.
 *
 * @private internal admin table utility
 */
const ADMIN_TABLE_STRING_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

/**
 * Inputs required to resolve the next sort state.
 *
 * @private internal admin table utility
 */
type ResolveNextAdminTableSortStateOptions<TSortField extends string> = {
    readonly currentSortBy: TSortField;
    readonly currentSortOrder: AdminTableSortOrder;
    readonly nextSortBy: TSortField;
    readonly resolveDefaultSortOrder?: AdminTableDefaultSortOrderResolver<TSortField>;
};

/**
 * Options accepted by `useAdminTableSorting`.
 *
 * @private internal admin table utility
 */
type UseAdminTableSortingOptions<TRow, TSortField extends string> = {
    readonly defaultSortBy: TSortField;
    readonly defaultSortOrder?: AdminTableSortOrder;
    readonly resolveDefaultSortOrder?: AdminTableDefaultSortOrderResolver<TSortField>;
    readonly rows: ReadonlyArray<TRow>;
    readonly resolveSortValue: AdminTableSortableValueResolver<TRow, TSortField>;
};

/**
 * Result returned from `useAdminTableSorting`.
 *
 * @private internal admin table utility
 */
type UseAdminTableSortingResult<TRow, TSortField extends string> = AdminTableSortState<TSortField> & {
    readonly handleSortChange: (sortBy: TSortField) => void;
    readonly isSortedBy: (sortBy: TSortField) => boolean;
    readonly sortedRows: Array<TRow>;
};

/**
 * Resolves the next admin table sort state after a header click.
 *
 * @private internal admin table utility
 */
export function resolveNextAdminTableSortState<TSortField extends string>(
    options: ResolveNextAdminTableSortStateOptions<TSortField>,
): AdminTableSortState<TSortField> {
    if (options.currentSortBy === options.nextSortBy) {
        return {
            sortBy: options.currentSortBy,
            sortOrder: options.currentSortOrder === 'asc' ? 'desc' : 'asc',
        };
    }

    return {
        sortBy: options.nextSortBy,
        sortOrder: options.resolveDefaultSortOrder?.(options.nextSortBy) ?? DEFAULT_ADMIN_TABLE_SORT_ORDER,
    };
}

/**
 * Sorts admin table rows by a resolved comparable value.
 *
 * @private internal admin table utility
 */
export function sortAdminTableRows<TRow, TSortField extends string>(options: {
    readonly rows: ReadonlyArray<TRow>;
    readonly sortBy: TSortField;
    readonly sortOrder: AdminTableSortOrder;
    readonly resolveSortValue: AdminTableSortableValueResolver<TRow, TSortField>;
}): Array<TRow> {
    return options.rows
        .map((row, index) => ({ index, row }))
        .sort((firstItem, secondItem) => {
            const comparison =
                compareAdminTableSortableValues(
                    options.resolveSortValue(firstItem.row, options.sortBy),
                    options.resolveSortValue(secondItem.row, options.sortBy),
                    options.sortOrder,
                ) || firstItem.index - secondItem.index;

            return comparison;
        })
        .map((item) => item.row);
}

/**
 * Keeps admin table sorting state and returns sorted rows for local datasets.
 *
 * @private internal admin table utility
 */
export function useAdminTableSorting<TRow, TSortField extends string>(
    options: UseAdminTableSortingOptions<TRow, TSortField>,
): UseAdminTableSortingResult<TRow, TSortField> {
    const [sortState, setSortState] = useState<AdminTableSortState<TSortField>>({
        sortBy: options.defaultSortBy,
        sortOrder: options.defaultSortOrder ?? DEFAULT_ADMIN_TABLE_SORT_ORDER,
    });

    const handleSortChange = useCallback(
        (sortBy: TSortField): void => {
            setSortState((currentSortState) =>
                resolveNextAdminTableSortState({
                    currentSortBy: currentSortState.sortBy,
                    currentSortOrder: currentSortState.sortOrder,
                    nextSortBy: sortBy,
                    resolveDefaultSortOrder: options.resolveDefaultSortOrder,
                }),
            );
        },
        [options.resolveDefaultSortOrder],
    );

    const isSortedBy = useCallback((sortBy: TSortField): boolean => sortState.sortBy === sortBy, [sortState.sortBy]);

    const sortedRows = useMemo(
        () =>
            sortAdminTableRows({
                rows: options.rows,
                sortBy: sortState.sortBy,
                sortOrder: sortState.sortOrder,
                resolveSortValue: options.resolveSortValue,
            }),
        [options.resolveSortValue, options.rows, sortState.sortBy, sortState.sortOrder],
    );

    return {
        sortBy: sortState.sortBy,
        sortOrder: sortState.sortOrder,
        handleSortChange,
        isSortedBy,
        sortedRows,
    };
}

/**
 * Compares two sortable values using the requested direction.
 *
 * Missing values stay last regardless of the active direction.
 *
 * @private internal admin table utility
 */
function compareAdminTableSortableValues(
    firstValue: AdminTableSortableValue,
    secondValue: AdminTableSortableValue,
    sortOrder: AdminTableSortOrder,
): number {
    const isFirstValueMissing = firstValue === null || firstValue === undefined || firstValue === '';
    const isSecondValueMissing = secondValue === null || secondValue === undefined || secondValue === '';

    if (isFirstValueMissing && isSecondValueMissing) {
        return 0;
    }
    if (isFirstValueMissing) {
        return 1;
    }
    if (isSecondValueMissing) {
        return -1;
    }

    const comparison = compareDefinedAdminTableSortableValues(firstValue, secondValue);
    return sortOrder === 'asc' ? comparison : -comparison;
}

/**
 * Compares two non-empty sortable values.
 *
 * @private internal admin table utility
 */
function compareDefinedAdminTableSortableValues(
    firstValue: Exclude<AdminTableSortableValue, null | undefined>,
    secondValue: Exclude<AdminTableSortableValue, null | undefined>,
): number {
    if (firstValue instanceof Date || secondValue instanceof Date) {
        const firstTimeValue = getAdminTableTimeValue(firstValue);
        const secondTimeValue = getAdminTableTimeValue(secondValue);

        if (Number.isFinite(firstTimeValue) && Number.isFinite(secondTimeValue)) {
            return firstTimeValue - secondTimeValue;
        }
    }

    if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return firstValue - secondValue;
    }

    if (typeof firstValue === 'boolean' && typeof secondValue === 'boolean') {
        return Number(firstValue) - Number(secondValue);
    }

    return ADMIN_TABLE_STRING_COLLATOR.compare(String(firstValue), String(secondValue));
}

/**
 * Converts sortable date-like values into numeric timestamps.
 *
 * @private internal admin table utility
 */
function getAdminTableTimeValue(value: Exclude<AdminTableSortableValue, null | undefined>): number {
    if (value instanceof Date) {
        return value.getTime();
    }

    return new Date(String(value)).getTime();
}

'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AdminTableSortOrder } from './adminTableSorting';

/**
 * Text alignment supported by sortable admin table headers.
 *
 * @private internal admin table component
 */
type AdminSortableTableHeaderAlignment = 'left' | 'right';

/**
 * Props for `AdminSortableTableHeaderCell`.
 *
 * @private internal admin table component
 */
type AdminSortableTableHeaderCellProps<TSortField extends string> = {
    readonly activeSortBy: TSortField;
    readonly children: ReactNode;
    readonly className: string;
    readonly label: string;
    readonly onSortChange: (sortBy: TSortField) => void;
    readonly sortBy: TSortField;
    readonly sortOrder: AdminTableSortOrder;
    readonly textAlign?: AdminSortableTableHeaderAlignment;
};

/**
 * Shared admin table header cell with clickable sort affordance.
 *
 * @private internal admin table component
 */
export function AdminSortableTableHeaderCell<TSortField extends string>({
    activeSortBy,
    children,
    className,
    label,
    onSortChange,
    sortBy,
    sortOrder,
    textAlign = 'left',
}: AdminSortableTableHeaderCellProps<TSortField>) {
    const isSorted = activeSortBy === sortBy;
    const SortIcon = isSorted ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

    return (
        <th className={className} aria-sort={resolveAdminSortableTableHeaderAriaSort(isSorted, sortOrder)}>
            <button
                type="button"
                onClick={() => onSortChange(sortBy)}
                className={`inline-flex w-full items-center gap-1.5 rounded-sm text-inherit transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    textAlign === 'right' ? 'justify-end' : 'justify-start'
                }`}
                title={`Sort by ${label}`}
                aria-label={`Sort by ${label}`}
            >
                <span>{children}</span>
                <SortIcon className={`h-3.5 w-3.5 ${isSorted ? 'text-gray-700' : 'text-gray-300'}`} aria-hidden />
            </button>
        </th>
    );
}

/**
 * Resolves the accessible sort state for one table header.
 *
 * @private internal admin table component
 */
function resolveAdminSortableTableHeaderAriaSort(
    isSorted: boolean,
    sortOrder: AdminTableSortOrder,
): 'ascending' | 'descending' | 'none' {
    if (!isSorted) {
        return 'none';
    }

    return sortOrder === 'asc' ? 'ascending' : 'descending';
}

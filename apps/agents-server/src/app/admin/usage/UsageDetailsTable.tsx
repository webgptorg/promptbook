'use client';

import type { ReactNode } from 'react';
/**
 * Props for the details table.
 */
type UsageDetailsTableProps = {
    headers: string[];
    rows: Array<Array<ReactNode>>;
    emptyLabel: string;
};

/**
 * Generic details table with flexible columns.
 */
export function UsageDetailsTable(props: UsageDetailsTableProps) {
    const { headers, rows, emptyLabel } = props;

    if (rows.length === 0) {
        return <p className="mt-4 text-sm text-gray-500">{emptyLabel}</p>;
    }

    return (
        <div className="mt-4 max-h-80 overflow-auto rounded-md border border-gray-100">
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={idx} className={`px-3 py-2 ${idx > 0 ? 'text-right' : ''}`}>
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-t border-gray-100">
                            {row.map((cell, cellIdx) => (
                                <td
                                    key={cellIdx}
                                    className={`px-3 py-2 text-gray-700 ${
                                        cellIdx > 0 ? 'text-right whitespace-nowrap' : 'font-medium truncate max-w-[200px]'
                                    }`}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

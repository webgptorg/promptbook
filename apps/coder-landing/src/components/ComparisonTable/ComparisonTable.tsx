import { COMPARISON_COLUMNS, COMPARISON_ROWS, PTBK_CODER_COLUMN_NAME } from '@/data/comparison';
import { ComparisonSolutionLogo } from './ComparisonSolutionLogo';
import { ComparisonSupportMark } from './ComparisonSupportMark';

/**
 * Classes of the sticky capability column, whose background must be opaque so that the
 * cells scrolling under it stay hidden.
 *
 * Note: The column is narrower on phones, so that one whole solution column fits next to it
 */
const STICKY_CAPABILITY_COLUMN_CLASS_NAME = 'sticky left-0 z-10 w-48 bg-promptbook-dark-gray sm:w-64';

/**
 * Decides whether one cell note is a command-line token, which the branding renders in monospace.
 *
 * Note: See the typography rules in [`specs/design.md`](../../../specs/design.md)
 */
function isCommandLineNote(note: string): boolean {
    return note.startsWith('-') || note.startsWith('ptbk ');
}

/**
 * Renders the capability matrix of `ptbk coder` and the coding agents it drives.
 *
 * Note: Specified in [`specs/sections/comparison.md`](../../../specs/sections/comparison.md)
 */
export function ComparisonTable() {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] table-fixed border-collapse text-left">
                <thead>
                    <tr>
                        <th
                            scope="col"
                            className={`${STICKY_CAPABILITY_COLUMN_CLASS_NAME} border-r border-gray-800 px-4 pb-6 align-bottom text-xs font-semibold uppercase tracking-wider text-gray-500`}
                        >
                            Capability
                        </th>
                        {COMPARISON_COLUMNS.map((column) => (
                            <th
                                key={column.columnName}
                                scope="col"
                                className={`px-4 pb-6 align-bottom ${
                                    column.columnName === PTBK_CODER_COLUMN_NAME
                                        ? 'rounded-t-xl bg-promptbook-blue-dark/10'
                                        : ''
                                }`}
                            >
                                <span className="flex flex-col items-center gap-2 text-center">
                                    <ComparisonSolutionLogo column={column} />
                                    <span
                                        className={`font-display text-base font-semibold ${
                                            column.columnName === PTBK_CODER_COLUMN_NAME
                                                ? 'text-promptbook-blue'
                                                : 'text-white'
                                        }`}
                                    >
                                        {column.displayName}
                                    </span>
                                    <span className="text-xs font-normal text-gray-500">by {column.vendorName}</span>
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {COMPARISON_ROWS.map((row) => (
                        <tr key={row.capability}>
                            <th
                                scope="row"
                                className={`${STICKY_CAPABILITY_COLUMN_CLASS_NAME} border-r border-t border-gray-800 px-4 py-4 align-top font-normal`}
                            >
                                <span className="font-display font-semibold text-white">{row.capability}</span>
                                <span className="mt-1 block text-sm text-gray-400">{row.description}</span>
                            </th>
                            {COMPARISON_COLUMNS.map((column) => {
                                const cell = row.cells[column.columnName];

                                return (
                                    <td
                                        key={column.columnName}
                                        className={`border-t border-gray-800 px-4 py-4 align-top ${
                                            column.columnName === PTBK_CODER_COLUMN_NAME
                                                ? 'bg-promptbook-blue-dark/10'
                                                : ''
                                        }`}
                                    >
                                        <span className="flex flex-col items-center gap-2 text-center">
                                            <ComparisonSupportMark level={cell.level} />
                                            <span
                                                className={`text-xs ${
                                                    column.columnName === PTBK_CODER_COLUMN_NAME
                                                        ? 'text-gray-300'
                                                        : 'text-gray-500'
                                                } ${isCommandLineNote(cell.note) ? 'font-mono' : ''}`}
                                            >
                                                {cell.note}
                                            </span>
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

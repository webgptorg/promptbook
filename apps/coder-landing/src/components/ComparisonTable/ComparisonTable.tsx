import { COMPARISON_COLUMNS, COMPARISON_ROWS, PTBK_CODER_COLUMN_NAME } from '@/data/comparison';
import { ComparisonSolutionLogo } from './ComparisonSolutionLogo';
import { ComparisonSupportMark } from './ComparisonSupportMark';
import { resolveComparisonRowCellGroups } from './resolveComparisonRowCellGroups';

/**
 * Classes of the sticky capability column, whose background must be opaque so that the
 * cells scrolling under it stay hidden.
 *
 * Note: The column is narrower on phones, so that one whole solution column fits next to it
 */
const STICKY_CAPABILITY_COLUMN_CLASS_NAME = 'sticky left-0 z-10 w-48 bg-promptbook-dark-gray sm:w-64';

/**
 * Classes of the `ptbk coder` column, tinted along its whole height so that it reads as the subject
 * of the table rather than as one more competitor.
 */
const PTBK_CODER_COLUMN_CLASS_NAME = 'bg-promptbook-blue-dark/10';

/**
 * Classes of one compared harness column, whose hairline divider shows where one claim ends and the
 * next begins, so that a cell covering several columns is recognizable as one.
 */
const COMPARED_HARNESS_COLUMN_CLASS_NAME = 'border-l border-gray-800/60';

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
                        {COMPARISON_COLUMNS.map((column) => {
                            const isPtbkCoderColumn = column.columnName === PTBK_CODER_COLUMN_NAME;

                            return (
                                <th
                                    key={column.columnName}
                                    scope="col"
                                    className={`px-4 pb-6 align-bottom ${
                                        isPtbkCoderColumn
                                            ? `rounded-t-xl ${PTBK_CODER_COLUMN_CLASS_NAME}`
                                            : COMPARED_HARNESS_COLUMN_CLASS_NAME
                                    }`}
                                >
                                    <span className="flex flex-col items-center gap-2 text-center">
                                        <ComparisonSolutionLogo column={column} />
                                        <span
                                            className={`font-display text-base font-semibold ${
                                                isPtbkCoderColumn ? 'text-promptbook-blue' : 'text-white'
                                            }`}
                                        >
                                            {column.displayName}
                                        </span>
                                        <span className="text-xs font-normal text-gray-500">
                                            by {column.vendorName}
                                        </span>
                                    </span>
                                </th>
                            );
                        })}
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
                            {resolveComparisonRowCellGroups(row).map((group) => {
                                const isPtbkCoderGroup = group.columnNames.includes(PTBK_CODER_COLUMN_NAME);

                                return (
                                    <td
                                        key={group.columnNames.join(' ')}
                                        colSpan={group.columnNames.length}
                                        className={`border-t border-gray-800 px-4 py-4 align-top ${
                                            isPtbkCoderGroup
                                                ? PTBK_CODER_COLUMN_CLASS_NAME
                                                : COMPARED_HARNESS_COLUMN_CLASS_NAME
                                        }`}
                                    >
                                        <span className="flex flex-col items-center gap-2 text-center">
                                            <ComparisonSupportMark level={group.cell.level} />
                                            <span
                                                className={`text-xs break-words ${
                                                    isPtbkCoderGroup ? 'text-gray-300' : 'text-gray-500'
                                                } ${isCommandLineNote(group.cell.note) ? 'font-mono' : ''}`}
                                            >
                                                {group.cell.note}
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

'use client';

import { AlertTriangleIcon } from 'lucide-react';
import type { TranspiledAgentExportWarning } from '../../../../utils/transpilers/getTranspiledAgentExportWarnings';

/**
 * Props for the export warning banner.
 *
 * @private type of `<TranspiledCodeExportWarningBanner/>`
 */
type TranspiledCodeExportWarningBannerProps = {
    /**
     * Non-transpilable commitment warnings computed for the current agent.
     */
    readonly warnings: ReadonlyArray<TranspiledAgentExportWarning>;
};

/**
 * Renders a warning banner when the current agent uses commitments that cannot be exported 1:1.
 *
 * @private internal component of `<AgentCodePageClient/>`
 */
export function TranspiledCodeExportWarningBanner({ warnings }: TranspiledCodeExportWarningBannerProps) {
    if (warnings.length === 0) {
        return null;
    }

    return (
        <div
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
        >
            <div className="flex items-start gap-3">
                <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                <div className="min-w-0">
                    <p className="text-sm font-semibold">Some agent functionality cannot be transpiled exactly.</p>
                    <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/80">
                        The exported code may not behave 1:1 with the live agent in Agents Server.
                    </p>

                    <ul className="mt-3 space-y-3">
                        {warnings.map((warning) => (
                            <li key={warning.commitmentName} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[0.85em] text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                                            {warning.commitmentName}
                                        </code>
                                    </p>
                                    <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/80">
                                        {warning.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

'use client';

import type { ReactNode } from 'react';

/**
 * Props for one page section card.
 *
 * @private type of `<AgentCodePageSection/>`
 */
type AgentCodePageSectionProps = {
    /**
     * Section heading shown above the content.
     */
    readonly title: string;

    /**
     * Supporting copy shown under the title.
     */
    readonly description: string;

    /**
     * Optional header actions rendered beside the title.
     */
    readonly actions?: ReactNode;

    /**
     * Main section content.
     */
    readonly children: ReactNode;
};

/**
 * Shared card section used on the export-as-transpiled-code page.
 *
 * @private internal component of `<AgentCodePageClient/>`
 */
export function AgentCodePageSection({ title, description, actions, children }: AgentCodePageSectionProps) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
                </div>

                {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
            </div>

            <div className="p-5">{children}</div>
        </section>
    );
}

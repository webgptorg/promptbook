import Link from 'next/link';
import { ReinstateBundledAgentsButton } from '../DefaultAgents/ReinstateBundledAgentsButton';

/**
 * Admin page tracking the presence of the core agents.
 *
 * @private constant of <DefaultAgentsStatusNotice/>
 */
const CORE_AGENTS_ADMIN_HREF = '/admin/core-agents';

/**
 * Props for the admin-only home page notice about missing bundled agents.
 *
 * @private props of <DefaultAgentsStatusNotice/>
 */
type DefaultAgentsStatusNoticeProps = {
    /**
     * Whether at least one core agent is missing.
     */
    readonly isAnyCoreAgentMissing: boolean;

    /**
     * Whether at least one normal default agent is missing.
     */
    readonly isAnyDefaultAgentMissing: boolean;

    /**
     * Titles of the core agents that are currently missing.
     */
    readonly missingCoreAgentTitles: ReadonlyArray<string>;

    /**
     * Titles of the normal default agents that are currently missing.
     */
    readonly missingDefaultAgentTitles: ReadonlyArray<string>;
};

/**
 * Admin-only home page notice that warns when core agents are missing and informs when normal default agents are
 * missing, each with a single button to reinstate them.
 *
 * @param props - Missing-agent status resolved on the server.
 * @returns Notice banners, or `null` when nothing is missing.
 *
 * @private internal component of the Agents Server home page
 */
export function DefaultAgentsStatusNotice({
    isAnyCoreAgentMissing,
    isAnyDefaultAgentMissing,
    missingCoreAgentTitles,
    missingDefaultAgentTitles,
}: DefaultAgentsStatusNoticeProps) {
    if (!isAnyCoreAgentMissing && !isAnyDefaultAgentMissing) {
        return null;
    }

    return (
        <div className="mb-8 space-y-4">
            {isAnyCoreAgentMissing && (
                <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                    <h2 className="text-lg font-semibold">Core agents are missing</h2>
                    <p className="mt-1 text-sm">
                        The core agents are used as a base for every other agent on this server. The following core
                        agents are missing: {formatAgentTitles(missingCoreAgentTitles)}. You can reinstate them with a
                        single click; existing agents are left untouched.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <ReinstateBundledAgentsButton
                            scope="core"
                            label="Reinstate core agents"
                            pendingLabel="Reinstating…"
                            confirmMessage="Recreate the missing core agents from the bundled repository books?"
                            className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <Link
                            href={CORE_AGENTS_ADMIN_HREF}
                            className="text-sm font-medium text-amber-800 underline underline-offset-2 hover:text-amber-900 dark:text-amber-200"
                        >
                            Open Core Agents page
                        </Link>
                    </div>
                </section>
            )}

            {isAnyDefaultAgentMissing && (
                <section className="rounded-2xl border border-blue-300 bg-blue-50 p-5 text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100">
                    <h2 className="text-lg font-semibold">Default agents are missing</h2>
                    <p className="mt-1 text-sm">
                        The default agents showcase what Promptbook agents can do. The following default agents are
                        missing: {formatAgentTitles(missingDefaultAgentTitles)}. You can reinstate them with a single
                        click; existing agents are left untouched.
                    </p>
                    <div className="mt-4">
                        <ReinstateBundledAgentsButton
                            scope="default"
                            label="Reinstate default agents"
                            pendingLabel="Reinstating…"
                            confirmMessage="Recreate the missing default agents from the bundled repository books?"
                            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </div>
                </section>
            )}
        </div>
    );
}

/**
 * Formats a list of agent titles for inline display.
 *
 * @param agentTitles - Titles of the missing agents.
 * @returns Comma-separated titles, or a fallback when the list is empty.
 *
 * @private utility of <DefaultAgentsStatusNotice/>
 */
function formatAgentTitles(agentTitles: ReadonlyArray<string>): string {
    if (agentTitles.length === 0) {
        return 'none';
    }
    return agentTitles.join(', ');
}

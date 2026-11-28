import { MarkdownContent } from '@promptbook-local/components';
import Link from 'next/link';
import { ReinstateBundledAgentsButton } from '../../../components/DefaultAgents/ReinstateBundledAgentsButton';
import { ForbiddenPage } from '../../../components/ForbiddenPage/ForbiddenPage';
import { resolveDefaultAgentsStatus, type CoreAgentReport } from '../../../utils/defaultAgents/resolveDefaultAgentsStatus';
import { isUserAdmin } from '../../../utils/isUserAdmin';

/**
 * Force dynamic rendering so the core-agent presence always reflects the live database.
 */
export const dynamic = 'force-dynamic';

/**
 * Builds the link to the editable book of one present core agent.
 *
 * @param coreAgent - Core agent report row.
 * @returns Book editor path, or `null` when the agent is missing.
 */
function resolveCoreAgentBookHref(coreAgent: CoreAgentReport): string | null {
    const agentIdentifier = coreAgent.permanentId ?? coreAgent.agentName;
    if (!coreAgent.isPresent) {
        return null;
    }
    return `/agents/${encodeURIComponent(agentIdentifier)}/book`;
}

/**
 * Admin page that tracks whether all core agents are present and explains why each one exists.
 */
export default async function CoreAgentsPage() {
    if (!(await isUserAdmin())) {
        return <ForbiddenPage />;
    }

    const { coreAgents, isAnyCoreAgentMissing } = await resolveDefaultAgentsStatus();
    const missingCoreAgentCount = coreAgents.filter((coreAgent) => !coreAgent.isPresent).length;

    return (
        <div className="w-full max-w-screen-lg mx-auto px-2 py-8 sm:px-4 md:px-8">
            <div className="mt-20 mb-8 space-y-3">
                <h1 className="text-3xl font-light text-gray-900 dark:text-gray-100">Core agents</h1>
                <p className="max-w-3xl text-sm text-gray-500 dark:text-gray-400">
                    Core agents are bundled in the <code>.core</code> folder and are used as a base for every other agent
                    on this server. This page tracks whether all core agents are present and explains why each one
                    exists.
                </p>
            </div>

            {isAnyCoreAgentMissing ? (
                <section className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                    <h2 className="text-lg font-semibold">
                        {missingCoreAgentCount} core{' '}
                        {missingCoreAgentCount === 1 ? 'agent is' : 'agents are'} missing
                    </h2>
                    <p className="mt-1 text-sm">
                        Reinstate the missing core agents with a single click. Existing core agents are left untouched,
                        so any edits you made are preserved.
                    </p>
                    <div className="mt-4">
                        <ReinstateBundledAgentsButton
                            scope="core"
                            label="Reinstate core agents"
                            pendingLabel="Reinstating…"
                            confirmMessage="Recreate the missing core agents from the bundled repository books?"
                            className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </div>
                </section>
            ) : (
                <section className="mb-8 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <h2 className="text-lg font-semibold">All core agents are present</h2>
                    <p className="mt-1 text-sm">
                        Every bundled core agent exists on this server. Editing a core agent is fine — differences from
                        the bundled repository version are shown below for reference only.
                    </p>
                </section>
            )}

            <div className="space-y-4">
                {coreAgents.map((coreAgent) => (
                    <CoreAgentCard key={coreAgent.agentName} coreAgent={coreAgent} />
                ))}
            </div>
        </div>
    );
}

/**
 * Renders one core agent row with its presence, repository difference, explanation, and edit link.
 *
 * @param props - Core agent report row.
 */
function CoreAgentCard({ coreAgent }: { readonly coreAgent: CoreAgentReport }) {
    const bookHref = resolveCoreAgentBookHref(coreAgent);

    return (
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{coreAgent.title}</h3>
                    <code className="text-xs text-gray-400">{coreAgent.agentName}</code>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {coreAgent.isPresent ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                            Present
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                            Missing
                        </span>
                    )}
                    {coreAgent.isPresent && coreAgent.isDifferentFromRepository && (
                        // Note: An edited core agent is fine — this chip is informational and intentionally neutral.
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            Edited (differs from repository)
                        </span>
                    )}
                    {coreAgent.isPresent && !coreAgent.isDifferentFromRepository && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            Matches repository
                        </span>
                    )}
                </div>
            </div>

            <div className="prose prose-sm prose-slate mt-3 max-w-none dark:prose-invert">
                <MarkdownContent content={coreAgent.explanation} />
            </div>

            {bookHref && (
                <div className="mt-4">
                    <Link
                        href={bookHref}
                        className="text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
                    >
                        Edit agent book
                    </Link>
                </div>
            )}
        </article>
    );
}

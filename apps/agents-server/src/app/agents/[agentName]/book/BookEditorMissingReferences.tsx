'use client';

import Link from 'next/link';
import { CORE_AGENTS_ADMIN_HREF } from '../../../../components/DefaultAgents/coreAgentsAdminRoute';
import { ReinstateBundledAgentsButton } from '../../../../components/DefaultAgents/ReinstateBundledAgentsButton';
import type { MissingAgentReference } from '../../../../utils/agentReferenceResolver/createUnresolvedAgentReferenceDiagnostics';
import type { MissingCoreAgentRecovery } from '../../../../utils/agentReferenceResolver/MissingCoreAgentRecovery';

/**
 * Props for `BookEditorMissingReferences`.
 *
 * @private function of BookEditorWrapper
 */
type BookEditorMissingReferencesProps = {
    /**
     * Unresolved references detected in the current book.
     */
    readonly missingAgentReferences: ReadonlyArray<MissingAgentReference>;
    /**
     * Reference currently being created.
     */
    readonly creatingReference: string | null;
    /**
     * Handles creating one referenced agent.
     */
    readonly onCreateReferencedAgent: (reference: MissingAgentReference) => void;
    /**
     * Handles refreshing the panel once the missing core agents were reinstated.
     */
    readonly onCoreAgentsReinstated: () => void;
    /**
     * Additional classes applied to the root panel.
     */
    readonly className?: string;
};

/**
 * Renders the unresolved-agent cards shown next to the editor.
 *
 * @private function of BookEditorWrapper
 */
export function BookEditorMissingReferences({
    missingAgentReferences,
    creatingReference,
    onCreateReferencedAgent,
    onCoreAgentsReinstated,
    className,
}: BookEditorMissingReferencesProps) {
    if (missingAgentReferences.length === 0) {
        return null;
    }

    return (
        <aside className={className}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Missing referenced agents
            </p>
            <div className="flex flex-col gap-4">
                {missingAgentReferences.map((reference) => (
                    <MissingAgentReferenceCard
                        key={reference.reference}
                        member={reference}
                        isCreating={creatingReference === reference.reference}
                        onCreate={() => onCreateReferencedAgent(reference)}
                        onCoreAgentsReinstated={onCoreAgentsReinstated}
                    />
                ))}
            </div>
        </aside>
    );
}

/**
 * Props for an individual missing-agent reference card.
 */
type MissingAgentReferenceCardProps = {
    /**
     * Missing reference to display.
     */
    readonly member: MissingAgentReference;
    /**
     * Whether the create action is running.
     */
    readonly isCreating: boolean;
    /**
     * Invoked when the user wants to create the referenced agent.
     */
    readonly onCreate: () => void;
    /**
     * Invoked once the missing core agents were reinstated.
     */
    readonly onCoreAgentsReinstated: () => void;
};

/**
 * Renders one unresolved-agent card with the action that can bring the agent back.
 *
 * An ordinary agent is created from scratch, while a bundled core agent is reinstated from its repository book, so
 * the card offers whichever of the two actually applies.
 */
function MissingAgentReferenceCard({
    member,
    isCreating,
    onCreate,
    onCoreAgentsReinstated,
}: MissingAgentReferenceCardProps) {
    const displayToken = member.token || member.reference;
    const commitmentLabel = formatCommitmentLabel(member.commitmentType);

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/88">
            <p className="text-sm text-slate-700 dark:text-slate-300">
                Referenced agent <span className="font-semibold text-slate-900 dark:text-slate-100">{displayToken}</span>{' '}
                is not found.
                {!member.coreAgentRecovery && ' Do you want to create it?'}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {member.isImplicit
                    ? `Implicitly inherited through ${commitmentLabel}`
                    : `Missing in the ${commitmentLabel} commitment`}
            </p>
            {member.coreAgentRecovery ? (
                <MissingCoreAgentRecoveryActions
                    displayToken={displayToken}
                    coreAgentRecovery={member.coreAgentRecovery}
                    onCoreAgentsReinstated={onCoreAgentsReinstated}
                />
            ) : (
                <button
                    type="button"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-100 disabled:opacity-70 dark:disabled:bg-slate-700 dark:disabled:text-slate-300"
                    onClick={onCreate}
                    disabled={isCreating}
                >
                    {isCreating ? `Creating ${displayToken}...` : `Create ${displayToken}`}
                </button>
            )}
        </div>
    );
}

/**
 * Props for the core-agent recovery block of one missing-reference card.
 */
type MissingCoreAgentRecoveryActionsProps = {
    /**
     * Token of the missing core agent as shown in the card headline.
     */
    readonly displayToken: string;
    /**
     * Reinstatement offered for the missing core agents.
     */
    readonly coreAgentRecovery: MissingCoreAgentRecovery;
    /**
     * Invoked once the missing core agents were reinstated.
     */
    readonly onCoreAgentsReinstated: () => void;
};

/**
 * Renders the reinstate action and the Core Agents page link for a missing bundled core agent.
 *
 * Reinstating always restores every missing core agent at once, so the block also names the other ones that are gone.
 */
function MissingCoreAgentRecoveryActions({
    displayToken,
    coreAgentRecovery,
    onCoreAgentsReinstated,
}: MissingCoreAgentRecoveryActionsProps) {
    const { missingCoreAgentTitles, isReinstateAllowed } = coreAgentRecovery;

    return (
        <>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {displayToken} is a core agent bundled with this server, so it is reinstated from its repository book
                instead of being created from scratch.
            </p>
            {missingCoreAgentTitles.length > 1 && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Missing core agents: {missingCoreAgentTitles.join(', ')}. Reinstating brings back all of them.
                </p>
            )}
            {isReinstateAllowed && (
                <ReinstateBundledAgentsButton
                    scope="core"
                    label="Reinstate core agents"
                    pendingLabel="Reinstating…"
                    confirmMessage="Recreate the missing core agents from the bundled repository books?"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    onReinstated={onCoreAgentsReinstated}
                />
            )}
            <Link
                href={CORE_AGENTS_ADMIN_HREF}
                className="mt-3 inline-block text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
            >
                Open Core Agents page
            </Link>
        </>
    );
}

/**
 * Formats one commitment type into a human-readable label.
 */
function formatCommitmentLabel(commitmentType: MissingAgentReference['commitmentType']): string {
    return commitmentType === 'IMPORTS' ? 'IMPORT' : commitmentType;
}

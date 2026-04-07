'use client';

import type { MissingAgentReference } from '../../../../utils/agentReferenceResolver/createUnresolvedAgentReferenceDiagnostics';

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
    className,
}: BookEditorMissingReferencesProps) {
    if (missingAgentReferences.length === 0) {
        return null;
    }

    return (
        <aside className={className}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing referenced agents</p>
            <div className="flex flex-col gap-4">
                {missingAgentReferences.map((reference) => (
                    <MissingAgentReferenceCard
                        key={reference.reference}
                        member={reference}
                        isCreating={creatingReference === reference.reference}
                        onCreate={() => onCreateReferencedAgent(reference)}
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
};

/**
 * Renders one unresolved-agent card with a create action.
 */
function MissingAgentReferenceCard({ member, isCreating, onCreate }: MissingAgentReferenceCardProps) {
    const displayToken = member.token || member.reference;
    const commitmentLabel = formatCommitmentLabel(member.commitmentType);

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm text-slate-700">
                Referenced agent <span className="font-semibold text-slate-900">{displayToken}</span> is not found. Do
                you want to create it?
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                Missing in the {commitmentLabel} commitment
            </p>
            <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-400 disabled:opacity-70"
                onClick={onCreate}
                disabled={isCreating}
            >
                {isCreating ? `Creating ${displayToken}...` : `Create ${displayToken}`}
            </button>
        </div>
    );
}

/**
 * Formats one commitment type into a human-readable label.
 */
function formatCommitmentLabel(commitmentType: MissingAgentReference['commitmentType']): string {
    return commitmentType === 'IMPORTS' ? 'IMPORT' : commitmentType;
}

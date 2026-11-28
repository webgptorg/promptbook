import { CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES } from '../../../../../servers';
import { normalizeAgentName } from '../../../../../src/book-2.0/agent-source/normalizeAgentName';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { resolveDefaultAgentsStatus, type CoreAgentReport } from '../defaultAgents/resolveDefaultAgentsStatus';
import { isImplicitAdamInheritance } from '../explicitFromCommitment';
import type { MissingAgentReference } from './createUnresolvedAgentReferenceDiagnostics';
import type { MissingCoreAgentRecovery } from './MissingCoreAgentRecovery';

/**
 * Dependencies needed to enrich unresolved references with bundled-core-agent recovery.
 *
 * @private utility of Agents Server agent-reference diagnostics
 */
export type ResolveCoreAgentAwareMissingReferencesOptions = {
    /**
     * Agent source currently edited in the Book editor.
     */
    readonly agentSource: string_book;

    /**
     * Unresolved compact references already detected in `agentSource`.
     */
    readonly missingAgentReferences: ReadonlyArray<MissingAgentReference>;

    /**
     * Whether the current user is allowed to reinstate the missing core agents.
     */
    readonly isReinstateAllowed: boolean;
};

/**
 * Extends unresolved compact references of one book with bundled-core-agent recovery.
 *
 * Two things are added here:
 *
 * 1. A reference naming a bundled core agent is marked as recoverable, because such an agent should be reinstated
 *    from its bundled book instead of being created empty from scratch.
 * 2. A book without any explicit `FROM` implicitly inherits from `@Adam`, so a missing Adam is reported right away
 *    even though no token in the book points at it.
 *
 * @param options - Current book, already-detected missing references, and the reinstate permission.
 * @returns Missing references carrying core-agent recovery, with the implicit `@Adam` ancestor first when missing.
 *
 * @private utility of Agents Server agent-reference diagnostics
 */
export async function resolveCoreAgentAwareMissingReferences(
    options: ResolveCoreAgentAwareMissingReferencesOptions,
): Promise<ReadonlyArray<MissingAgentReference>> {
    const { agentSource, missingAgentReferences, isReinstateAllowed } = options;
    const isAdamImplicitlyInherited = isImplicitAdamInheritance(agentSource);

    if (!isAdamImplicitlyInherited && missingAgentReferences.length === 0) {
        return missingAgentReferences;
    }

    const missingCoreAgents = await resolveMissingCoreAgents();

    if (missingCoreAgents.length === 0) {
        return missingAgentReferences;
    }

    const coreAgentRecovery: MissingCoreAgentRecovery = {
        missingCoreAgentTitles: missingCoreAgents.map((missingCoreAgent) => missingCoreAgent.title),
        isReinstateAllowed,
    };
    const recoverableMissingAgentReferences = missingAgentReferences.map((missingAgentReference) =>
        findMissingCoreAgent(missingCoreAgents, missingAgentReference.reference)
            ? { ...missingAgentReference, coreAgentRecovery }
            : missingAgentReference,
    );

    if (!isAdamImplicitlyInherited) {
        return recoverableMissingAgentReferences;
    }

    const missingAdamAgent = findMissingCoreAgent(missingCoreAgents, CORE_AGENTS_SERVER_WELL_KNOWN_AGENT_NAMES.ADAM);

    if (!missingAdamAgent || hasMissingAgentReferenceFor(recoverableMissingAgentReferences, missingAdamAgent)) {
        return recoverableMissingAgentReferences;
    }

    return [
        createImplicitAdamMissingReference(missingAdamAgent, coreAgentRecovery),
        ...recoverableMissingAgentReferences,
    ];
}

/**
 * Resolves which bundled core agents are absent from the current server.
 *
 * Presence comes from the same status the Core Agents admin page renders, so the panel linking to that page can never
 * disagree with it. Implicit inheritance always loads Adam from this very server, so a federated namesake elsewhere
 * must not count as present.
 *
 * @returns Reports of the bundled core agents that are missing, in bundled order.
 */
async function resolveMissingCoreAgents(): Promise<ReadonlyArray<CoreAgentReport>> {
    try {
        const { coreAgents } = await resolveDefaultAgentsStatus();
        return coreAgents.filter((coreAgent) => !coreAgent.isPresent);
    } catch (error) {
        console.warn('[AgentReferenceResolver] Failed to resolve the bundled core agent status:', error);
        return [];
    }
}

/**
 * Finds the missing bundled core agent one reference points to.
 *
 * @param missingCoreAgents - Bundled core agents currently missing on this server.
 * @param reference - Raw reference payload, for example `Adam` or `adam`.
 * @returns Matching missing core agent, or `undefined` when the reference names something else.
 */
function findMissingCoreAgent(
    missingCoreAgents: ReadonlyArray<CoreAgentReport>,
    reference: string,
): CoreAgentReport | undefined {
    const normalizedReference = normalizeAgentName(reference);
    return missingCoreAgents.find((missingCoreAgent) => missingCoreAgent.agentName === normalizedReference);
}

/**
 * Checks whether one missing core agent is already reported by an explicit reference written in the book.
 *
 * @param missingAgentReferences - Missing references detected in the book.
 * @param missingCoreAgent - Missing core agent to look for.
 * @returns True when the book already shows a card for that agent.
 */
function hasMissingAgentReferenceFor(
    missingAgentReferences: ReadonlyArray<MissingAgentReference>,
    missingCoreAgent: CoreAgentReport,
): boolean {
    return missingAgentReferences.some(
        (missingAgentReference) => normalizeAgentName(missingAgentReference.reference) === missingCoreAgent.agentName,
    );
}

/**
 * Creates the missing-reference entry standing for the implicit `FROM @Adam` ancestor.
 *
 * @param missingAdamAgent - Report of the missing Adam core agent.
 * @param coreAgentRecovery - Reinstatement offered for the missing core agents.
 * @returns Missing reference shown exactly like an explicitly referenced agent that was not found.
 */
function createImplicitAdamMissingReference(
    missingAdamAgent: CoreAgentReport,
    coreAgentRecovery: MissingCoreAgentRecovery,
): MissingAgentReference {
    return {
        reference: missingAdamAgent.title,
        token: `{${missingAdamAgent.title}}`,
        commitmentType: 'FROM',
        isImplicit: true,
        coreAgentRecovery,
    };
}

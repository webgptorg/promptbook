import type { AgentCollection, string_agent_permanent_id, string_book } from '@promptbook-local/types';
import { computeAgentHash } from '../../../../src/book-2.0/agent-source/computeAgentHash';
import { $invalidateProvidedAgentReferenceResolverCache } from './agentReferenceResolver/$provideAgentReferenceResolver';
import { scheduleAgentPreparation } from './agentPreparation';
import { invalidateCachedServerAgentRuntime } from './cachedServerAgentRuntime';
import { trySynchronizeExternalAgentRepository } from './externalChatRunner/ensureExternalAgentRepository';

/**
 * Marker key used to prevent double-decoration of the same collection instance.
 */
const AGENT_PREPARATION_DECORATED_FLAG = '__agentPreparationDecorated';

/**
 * Collection shape extended with runtime decoration marker.
 */
type DecoratableAgentCollection = AgentCollection & {
    [AGENT_PREPARATION_DECORATED_FLAG]?: boolean;
};

/**
 * Removes META ID lines before fingerprinting so hashes match persisted AgentCollection behavior.
 */
function stripMetaIdLines(agentSource: string_book): string_book {
    const strippedLines = agentSource.split(/\r?\n/).filter((line) => !line.trim().startsWith('META ID '));

    return strippedLines.join('\n') as string_book;
}

/**
 * Computes persisted-equivalent source fingerprint used by pre-index scheduling.
 */
function computePersistedAgentFingerprint(agentSource: string_book): string {
    const normalizedSource = stripMetaIdLines(agentSource);
    return computeAgentHash(normalizedSource);
}

/**
 * Decorates AgentCollection create/update writes to schedule debounced background pre-indexing.
 */
export function attachAgentPreparationScheduling(
    collection: AgentCollection,
    options: {
        readonly tablePrefix: string;
    },
): AgentCollection {
    const decoratableCollection = collection as DecoratableAgentCollection;
    if (decoratableCollection[AGENT_PREPARATION_DECORATED_FLAG]) {
        return collection;
    }

    const tablePrefix = options.tablePrefix;

    const originalCreateAgent = collection.createAgent.bind(collection);
    collection.createAgent = async (...args) => {
        const [agentSource] = args;
        const createdAgent = await originalCreateAgent(...args);
        $invalidateProvidedAgentReferenceResolverCache();
        invalidateCachedServerAgentRuntime();

        if (createdAgent.permanentId) {
            await trySynchronizeExternalAgentRepository({
                agentName: createdAgent.agentName,
                agentPermanentId: createdAgent.permanentId,
                agentSource,
            }).catch((error) => {
                console.error('[external-chat-runner] Failed to synchronize created agent repository', {
                    agentPermanentId: createdAgent.permanentId,
                    error,
                });
            });

            await scheduleAgentPreparation({
                tablePrefix,
                agentPermanentId: createdAgent.permanentId,
                fingerprint: createdAgent.agentHash,
                triggerReason: 'AGENT_CREATED',
            });
        }

        return createdAgent;
    };

    const originalUpdateAgentSource = collection.updateAgentSource.bind(collection);
    collection.updateAgentSource = async (
        permanentId: string_agent_permanent_id,
        agentSource: string_book,
        options?: { readonly versionName?: string | null },
    ) => {
        await originalUpdateAgentSource(permanentId, agentSource, options);
        $invalidateProvidedAgentReferenceResolverCache();
        invalidateCachedServerAgentRuntime();

        const fingerprint = computePersistedAgentFingerprint(agentSource);
        const agents = await collection.listAgents();
        const agent = agents.find((candidate) => candidate.permanentId === permanentId);

        await trySynchronizeExternalAgentRepository({
            agentName: agent?.agentName || permanentId,
            agentPermanentId: permanentId,
            agentSource,
        }).catch((error) => {
            console.error('[external-chat-runner] Failed to synchronize updated agent repository', {
                agentPermanentId: permanentId,
                error,
            });
        });

        await scheduleAgentPreparation({
            tablePrefix,
            agentPermanentId: permanentId,
            fingerprint,
            triggerReason: 'AGENT_UPDATED',
        });
    };

    decoratableCollection[AGENT_PREPARATION_DECORATED_FLAG] = true;

    return collection;
}

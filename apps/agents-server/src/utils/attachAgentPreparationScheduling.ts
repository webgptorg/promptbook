import { computeAgentHash } from '@promptbook-local/core';
import { AgentCollection, string_agent_permanent_id, string_book } from '@promptbook-local/types';
import { scheduleAgentPreparation } from './agentPreparation';

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
    const strippedLines = agentSource
        .split(/\r?\n/)
        .filter((line) => !line.trim().startsWith('META ID '));

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
        const createdAgent = await originalCreateAgent(...args);

        if (createdAgent.permanentId) {
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

        const fingerprint = computePersistedAgentFingerprint(agentSource);
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

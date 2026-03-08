import { AgentCollection, string_agent_permanent_id, string_book } from '@promptbook-local/types';
import { computePersistedAgentFingerprint, scheduleAgentPreparation } from './agentPreparation';

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
    collection.updateAgentSource = async (permanentId: string_agent_permanent_id, agentSource: string_book) => {
        await originalUpdateAgentSource(permanentId, agentSource);

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

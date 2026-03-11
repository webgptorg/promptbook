import { describe, expect, it, jest } from '@jest/globals';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import type { AgentCollection } from '../../../../../src/collection/agent-collection/AgentCollection';
import type { string_agent_permanent_id } from '../../../../../src/types/typeAliases';
import { createSelfLearningAgentSourcePersistence } from './createSelfLearningAgentSourcePersistence';

describe('createSelfLearningAgentSourcePersistence', () => {
    it('reuses exactly one history snapshot and names it only on the final update', async () => {
        const agentPermanentId = 'agent-123' as string_agent_permanent_id;
        const updateAgentSource = jest
            .fn<AgentCollection['updateAgentSource']>()
            .mockResolvedValueOnce(17)
            .mockResolvedValueOnce(17)
            .mockResolvedValueOnce(17);
        const persistence = createSelfLearningAgentSourcePersistence({
            collection: {
                updateAgentSource,
            } as unknown as AgentCollection,
            agentPermanentId,
        });

        await persistence.persistAgentSourceUpdate('Agent\n\nPERSONA First.' as string_book, { isFinal: false });
        await persistence.persistAgentSourceUpdate('Agent\n\nPERSONA Second.' as string_book, { isFinal: false });
        await persistence.persistAgentSourceUpdate('Agent\n\nPERSONA Final.' as string_book, { isFinal: true });
        await persistence.waitForPendingSelfLearningPersistence();

        expect(updateAgentSource).toHaveBeenNthCalledWith(1, agentPermanentId, 'Agent\n\nPERSONA First.', {
            historySnapshotId: undefined,
            versionName: null,
        });
        expect(updateAgentSource).toHaveBeenNthCalledWith(2, agentPermanentId, 'Agent\n\nPERSONA Second.', {
            historySnapshotId: 17,
            versionName: null,
        });
        expect(updateAgentSource).toHaveBeenNthCalledWith(3, agentPermanentId, 'Agent\n\nPERSONA Final.', {
            historySnapshotId: 17,
            versionName: 'self-learning',
        });
    });
});

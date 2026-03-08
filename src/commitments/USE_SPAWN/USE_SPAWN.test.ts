import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';

describe('createAgentModelRequirementsWithCommitments with USE SPAWN', () => {
    it('adds spawn_agent tool with strict schema', async () => {
        const agentSource = spaceTrim(`
            Spawner
            USE SPAWN
        `) as string_book;
        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);
        const spawnTool = requirements.tools?.find((tool) => tool.name === 'spawn_agent');

        expect(spawnTool).toBeDefined();
        expect(spawnTool?.parameters.additionalProperties).toBe(false);
        expect(spawnTool?.parameters.required).toEqual(['source']);
        expect(requirements.systemMessage).toContain('Use "spawn_agent" only when user asks to create a persistent new agent.');
    });
});

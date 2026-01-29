import { describe, expect, it } from '@jest/globals';
import { createAgentModelRequirementsWithCommitments } from './createAgentModelRequirementsWithCommitments';
import { validateBook } from './string_book';

describe('createAgentModelRequirementsWithCommitments with IMPORT', () => {
    it('successfully finishes even if file imports fail in test environment', async () => {
        const agentSource = validateBook(`
            My Agent
            IMPORT https://example.com/file.txt
        `);
        const result = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(result.systemMessage).toContain('You are My Agent');
        // In test environment without proper network/fs setup, imports might fail and be logged as warnings,
        // but the function should still return the basic requirements.
    });

    it('contains basic information when multiple imports are present', async () => {
        const agentSource = validateBook(`
            My Agent
            IMPORT ./local/path/data.json
            IMPORT https://example.com/poem.txt
        `);
        const result = await createAgentModelRequirementsWithCommitments(agentSource);
        expect(result.systemMessage).toContain('You are My Agent');
    });
});

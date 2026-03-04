import { describe, expect, it } from '@jest/globals';
import { validateBook } from '../../../../../src/book-2.0/agent-source/string_book';
import { extractUseEmailConfigurationFromAgentSource } from './extractUseEmailConfigurationFromAgentSource';

describe('extractUseEmailConfigurationFromAgentSource', () => {
    it('detects USE EMAIL with sender', () => {
        const configuration = extractUseEmailConfigurationFromAgentSource(
            validateBook(`
                Email Agent
                USE EMAIL agent@example.com Keep emails concise.
            `),
        );

        expect(configuration).toEqual({
            isEnabled: true,
            senderEmail: 'agent@example.com',
        });
    });

    it('detects USE EMAIL without sender', () => {
        const configuration = extractUseEmailConfigurationFromAgentSource(
            validateBook(`
                Email Agent
                USE EMAIL Keep emails concise.
            `),
        );

        expect(configuration).toEqual({
            isEnabled: true,
        });
    });

    it('returns disabled when USE EMAIL is missing', () => {
        const configuration = extractUseEmailConfigurationFromAgentSource(
            validateBook(`
                Agent
                RULE Respond in plain text.
            `),
        );

        expect(configuration).toEqual({
            isEnabled: false,
        });
    });
});

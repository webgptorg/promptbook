import { describe, expect, it } from '@jest/globals';
import { parseAgentSource } from './parseAgentSource';
import { validateBook } from './string_book';

describe('parseAgentSource with IMPORT', () => {
    it('parses generic IMPORT with URL', () => {
        const agentSource = validateBook(`
            My Agent
            IMPORT https://example.com/file.txt
        `);
        const result = parseAgentSource(agentSource);
        expect(result.capabilities).toContainEqual({
            agentUrl: 'https://example.com/file.txt',
            iconName: 'ExternalLink',
            label: 'example.com.../file.txt',
            type: 'import',
        });
    });

    it('parses generic IMPORT with local path', () => {
        const agentSource = validateBook(`
            My Agent
            IMPORT ./local/path/data.json
        `);
        const result = parseAgentSource(agentSource);
        expect(result.capabilities).toContainEqual({
            agentUrl: './local/path/data.json',
            iconName: 'Link',
            label: 'data.json',
            type: 'import',
        });
    });

    it('parses generic KNOWLEDGE with URL', () => {
        const agentSource = validateBook(`
            My Agent
            KNOWLEDGE https://example.com/file.txt
        `);
        const result = parseAgentSource(agentSource);
        expect(result.capabilities).toContainEqual({
            type: 'knowledge',
            label: 'example.com',
            iconName: 'Book',
        });
    });
});

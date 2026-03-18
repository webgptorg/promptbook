import { describe, expect, it } from '@jest/globals';
import { parseAgentSource } from '../../../../src/book-2.0/agent-source/parseAgentSource';
import { validateBook } from '../../../../src/book-2.0/agent-source/string_book';
import { renameAgentSource } from './renameAgentSource';

describe('renameAgentSource', () => {
    it('replaces the first non-empty line even when it starts with a commitment keyword', () => {
        const agentSource = validateBook(`

            PERSONA John

            PERSONA Actual persona
        `);

        const renamedAgentSource = renameAgentSource(agentSource, 'Renamed Agent');
        const renamedLines = renamedAgentSource.split(/\r?\n/);

        expect(renamedLines[2]).toBe('Renamed Agent');
        expect(parseAgentSource(validateBook(renamedAgentSource)).meta.fullname).toBe('Renamed Agent');
    });
});

import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from '@promptbook/utils';
import { createAgentSource } from '../../agent-source/string_agent_source';
import { parseAgentSourceWithCommitments } from './parseAgentSourceWithCommitments';

describe('parseAgentSourceWithCommitments with multiline support', () => {
    it('should parse single-line commitments correctly', () => {
        const agentSource = createAgentSource(
            spaceTrim(`
            Test Agent
            PERSONA Some persona description
            KNOWLEDGE https://example.com/knowledge.pdf
        `),
        );

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.agentName).toBe('Test Agent');
        expect(result.commitments).toHaveLength(2);

        expect(result.commitments[0]).toEqual({
            type: 'PERSONA',
            content: 'Some persona description',
            originalLine: 'PERSONA Some persona description',
            lineNumber: 2,
        });

        expect(result.commitments[1]).toEqual({
            type: 'KNOWLEDGE',
            content: 'https://example.com/knowledge.pdf',
            originalLine: 'KNOWLEDGE https://example.com/knowledge.pdf',
            lineNumber: 3,
        });
    });

    it('should parse multiline commitments correctly', () => {
        const agentSource = createAgentSource(
            spaceTrim(`
            Test Agent
            PERSONA Another persona description
            which is continued on the next line
            and also on the next line


            and also on the next paragraph
            PERSONA New persona description
            KNOWLEDGE Some knowledge description

            which is continued on the next line


            PERSONA Yet another persona description
            continued description of the PERSONA
            and continued on the next line because the last keyword PERSONA was not at the start of the line
        `),
        );

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.agentName).toBe('Test Agent');
        expect(result.commitments).toHaveLength(3);

        // First multiline PERSONA
        expect(result.commitments[0]).toEqual({
            type: 'PERSONA',
            content: spaceTrim(`
                Another persona description
                which is continued on the next line
                and also on the next line


                and also on the next paragraph
            `),
            originalLine: 'PERSONA Another persona description',
            lineNumber: 2,
        });

        // Second PERSONA (single line)
        expect(result.commitments[1]).toEqual({
            type: 'PERSONA',
            content: 'New persona description',
            originalLine: 'PERSONA New persona description',
            lineNumber: 8,
        });

        // KNOWLEDGE with multiline content
        expect(result.commitments[2]).toEqual({
            type: 'KNOWLEDGE',
            content: spaceTrim(`
                Some knowledge description

                which is continued on the next line


                PERSONA Yet another persona description
                continued description of the PERSONA
                and continued on the next line because the last keyword PERSONA was not at the start of the line
            `),
            originalLine: 'KNOWLEDGE Some knowledge description',
            lineNumber: 9,
        });
    });

    it('should handle the exact example from the requirements', () => {
        const agentSource = createAgentSource(`Test Agent
PERSONA Some persona description
PERSONA Another persona description
which is continued on the next line
and also on the next line


and also on the next paragraph
PERSONA New persona description
KNOWLEDGE https://example.com/knowledge.pdf
KNOWLEDGE Some knowledge description

which is continued on the next line


PERSONA Yet another persona description
continued description of the PERSONA
and continued on the next line because the last keyword PERSONA was not at the start of the line`);

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.agentName).toBe('Test Agent');
        expect(result.commitments).toHaveLength(6);

        // First PERSONA (single line)
        expect(result.commitments[0]).toEqual({
            type: 'PERSONA',
            content: 'Some persona description',
            originalLine: 'PERSONA Some persona description',
            lineNumber: 2,
        });

        // Second PERSONA (multiline)
        expect(result.commitments[1]).toEqual({
            type: 'PERSONA',
            content: `Another persona description
which is continued on the next line
and also on the next line


and also on the next paragraph`,
            originalLine: 'PERSONA Another persona description',
            lineNumber: 3,
        });

        // Third PERSONA (single line)
        expect(result.commitments[2]).toEqual({
            type: 'PERSONA',
            content: 'New persona description',
            originalLine: 'PERSONA New persona description',
            lineNumber: 9,
        });

        // First KNOWLEDGE (single line)
        expect(result.commitments[3]).toEqual({
            type: 'KNOWLEDGE',
            content: 'https://example.com/knowledge.pdf',
            originalLine: 'KNOWLEDGE https://example.com/knowledge.pdf',
            lineNumber: 10,
        });

        // Second KNOWLEDGE (multiline)
        expect(result.commitments[4]).toEqual({
            type: 'KNOWLEDGE',
            content: `Some knowledge description

which is continued on the next line


`,
            originalLine: 'KNOWLEDGE Some knowledge description',
            lineNumber: 11,
        });

        // Fourth PERSONA (multiline, continues until end)
        expect(result.commitments[5]).toEqual({
            type: 'PERSONA',
            content: `Yet another persona description
continued description of the PERSONA
and continued on the next line because the last keyword PERSONA was not at the start of the line`,
            originalLine: 'PERSONA Yet another persona description',
            lineNumber: 15,
        });
    });

    it('should handle empty lines and preserve spacing in multiline content', () => {
        const agentSource = createAgentSource(`Test Agent
PERSONA First persona

with empty line above
PERSONA Second persona`);

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments).toHaveLength(2);

        expect(result.commitments[0]).toEqual({
            type: 'PERSONA',
            content: `First persona

with empty line above`,
            originalLine: 'PERSONA First persona',
            lineNumber: 2,
        });

        expect(result.commitments[1]).toEqual({
            type: 'PERSONA',
            content: 'Second persona',
            originalLine: 'PERSONA Second persona',
            lineNumber: 5,
        });
    });

    it('should handle commitments with no initial content on the same line', () => {
        const agentSource = createAgentSource(`Test Agent
PERSONA
This is the content
that continues on multiple lines
KNOWLEDGE
https://example.com/knowledge.pdf`);

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments).toHaveLength(2);

        expect(result.commitments[0]).toEqual({
            type: 'PERSONA',
            content: `This is the content
that continues on multiple lines`,
            originalLine: 'PERSONA',
            lineNumber: 2,
        });

        expect(result.commitments[1]).toEqual({
            type: 'KNOWLEDGE',
            content: 'https://example.com/knowledge.pdf',
            originalLine: 'KNOWLEDGE',
            lineNumber: 5,
        });
    });

    it('should handle non-commitment lines correctly', () => {
        const agentSource = createAgentSource(`Test Agent
This is not a commitment
PERSONA Some persona
Another line that is not a commitment
KNOWLEDGE Some knowledge
Final non-commitment line`);

        const result = parseAgentSourceWithCommitments(agentSource);

        expect(result.commitments).toHaveLength(2);
        expect(result.nonCommitmentLines).toEqual([
            'Test Agent',
            'This is not a commitment',
            'Final non-commitment line',
        ]);
    });
});

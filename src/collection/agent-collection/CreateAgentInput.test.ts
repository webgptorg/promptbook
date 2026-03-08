import { describe, expect, it } from '@jest/globals';
import { LimitReachedError } from '../../errors/LimitReachedError';
import { ParseError } from '../../errors/ParseError';
import {
    CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH,
    parseCreateAgentInput,
} from './CreateAgentInput';

describe('parseCreateAgentInput', () => {
    it('parses valid create-agent payload', () => {
        const parsed = parseCreateAgentInput({
            source: 'Child Agent\nPERSONA You are helpful.',
            folderId: 12,
            sortOrder: 3,
            visibility: 'UNLISTED',
        });

        expect(parsed).toEqual({
            source: 'Child Agent\nPERSONA You are helpful.',
            folderId: 12,
            sortOrder: 3,
            visibility: 'UNLISTED',
        });
    });

    it('rejects payload without required source', () => {
        expect(() => parseCreateAgentInput({})).toThrow(ParseError);
    });

    it('rejects unknown fields', () => {
        expect(() =>
            parseCreateAgentInput({
                source: 'Child Agent',
                unknownField: true,
            }),
        ).toThrow(ParseError);
    });

    it('rejects too-large source payload', () => {
        expect(() =>
            parseCreateAgentInput({
                source: 'x'.repeat(CREATE_AGENT_INPUT_SOURCE_MAX_LENGTH + 1),
            }),
        ).toThrow(LimitReachedError);
    });
});

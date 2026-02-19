import { describe, expect, it } from '@jest/globals';
import { book } from '../../_packages/core.index';
import { extractOpenTeacherInstructions } from './extractOpenTeacherInstructions';

describe('extractOpenTeacherInstructions', () => {
    it('returns null when no OPEN commitment exists', () => {
        const agentSource = book`
            Sample Agent

            PERSONA Helpful assistant
        `;

        expect(extractOpenTeacherInstructions(agentSource)).toBeNull();
    });

    it('ignores empty OPEN content', () => {
        const agentSource = book`
            Sample Agent

            OPEN
        `;

        expect(extractOpenTeacherInstructions(agentSource)).toBeNull();
    });

    it('returns trimmed instructions from the last OPEN', () => {
        const agentSource = book`
            Sample Agent

            OPEN Teach gently.
        `;

        expect(extractOpenTeacherInstructions(agentSource)).toBe('Teach gently.');
    });

    it('prefers the last non-empty OPEN commit', () => {
        const agentSource = book`
            Sample Agent

            OPEN Step one.
            OPEN
            OPEN Step two.
        `;

        expect(extractOpenTeacherInstructions(agentSource)).toBe('Step two.');
    });
});

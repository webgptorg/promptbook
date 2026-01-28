import { describe, expect, it } from '@jest/globals';
import { resolveCitationUrl } from './resolveCitationUrl';
import { ChatParticipant } from '../types/ChatParticipant';
import { string_book } from '../../../book-2.0/agent-source/string_book';

describe('resolveCitationUrl', () => {
    const mockParticipant: ChatParticipant = {
        name: 'AGENT',
        fullname: 'Test Agent',
        agentSource: `
            AI Agent
            KNOWLEDGE https://ptbk.io/k/SS%202_2023%20-%20Informace%20106-fV9LzkrRbVN3zuMCEMgqb2ZeSxPPNs.docx
            KNOWLEDGE https://example.com/simple-document.pdf
        ` as string_book,
    };

    it('should resolve simple document', () => {
        expect(resolveCitationUrl('simple-document.pdf', [mockParticipant])).toBe(
            'https://example.com/simple-document.pdf',
        );
    });

    it('should resolve encoded document with messy name', () => {
        // This is the failing case from the prompt
        expect(resolveCitationUrl('SS 2023 - Informace 106', [mockParticipant])).toBe(
            'https://ptbk.io/k/SS%202_2023%20-%20Informace%20106-fV9LzkrRbVN3zuMCEMgqb2ZeSxPPNs.docx',
        );
    });
});

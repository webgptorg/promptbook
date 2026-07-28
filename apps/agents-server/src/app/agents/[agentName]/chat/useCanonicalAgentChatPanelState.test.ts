import { describe, expect, it } from '@jest/globals';
import { resolveAgentChatDisplayName } from './resolveAgentChatDisplayName';

describe('resolveAgentChatDisplayName', () => {
    it('uses the resolved human-readable title before the remote agent profile loads', () => {
        expect(resolveAgentChatDisplayName(undefined, 'Nový agent')).toBe('Nový agent');
    });

    it('keeps the resolved human-readable title when the remote profile has no fullname', () => {
        expect(resolveAgentChatDisplayName({ agentName: 'jXY4VaK8QbzRzk' }, 'Nový agent')).toBe('Nový agent');
    });

    it('prefers the remote profile fullname when it is available', () => {
        expect(
            resolveAgentChatDisplayName({ agentName: 'agent-id', meta: { fullname: 'Helpful Agent' } }, 'Nový agent'),
        ).toBe('Helpful Agent');
    });
});

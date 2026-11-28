import {
    createAgentEmailAddress,
    createAgentEmailAliases,
    createAgentIdEmailLocalPart,
    createAgentEmailLocalParts,
    getEmailAddressDomain,
    normalizeAgentEmailRecipientLocalPart,
    normalizeEmailAddressForIdentity,
} from './agentEmailAddress';

describe('agentEmailAddress', () => {
    it('creates dotted and compact aliases from a human name', () => {
        expect(createAgentEmailLocalParts('John Doe')).toEqual(['john.doe', 'johndoe']);
        expect(createAgentEmailLocalParts('Pavol Hejný')).toEqual(['pavol.hejny', 'pavolhejny']);
    });

    it('includes the display name, agent name, and permanent id aliases', () => {
        expect(
            createAgentEmailAliases({
                fullname: 'John Doe',
                agentName: 'Helpful John',
                permanentId: 'john-0123',
            }),
        ).toEqual([
            'john.doe',
            'johndoe',
            'helpful.john',
            'helpfuljohn',
            'john-0123',
            'john.0123',
            'john0123',
        ]);
    });

    it('uses the display name for the preferred address', () => {
        expect(
            createAgentEmailAddress(
                {
                    fullname: 'John Doe',
                    agentName: 'helper',
                    permanentId: 'agent-1',
                },
                'Agents-Server.com.',
            ),
        ).toBe('john.doe@agents-server.com');
    });

    it('preserves the exact agent id as a routable local part', () => {
        expect(createAgentIdEmailLocalPart('Agent-ID_123')).toBe('agent-id_123');
    });

    it('ignores plus tags when matching recipients and sender identities', () => {
        expect(normalizeAgentEmailRecipientLocalPart('John.Doe+test@agents-server.com')).toBe('john.doe');
        expect(normalizeEmailAddressForIdentity('John Doe <John.Doe+test@GMAIL.com>')).toBe('john.doe@gmail.com');
    });

    it('extracts a normalized domain from a display-name email address', () => {
        expect(getEmailAddressDomain('John Doe <John.Doe@AGENTS-SERVER.COM>')).toBe('agents-server.com');
    });
});

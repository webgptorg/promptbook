// cspell:ignore doqmrg iznfja
import { buildAgentNameOrPermanentIdFilter } from './buildAgentNameOrPermanentIdFilter';

describe('buildAgentNameOrPermanentIdFilter', () => {
    it('matches the agent name exactly and the permanent id case-insensitively', () => {
        expect(buildAgentNameOrPermanentIdFilter('doQMRg82izNfJa')).toBe(
            'agentName.eq.doQMRg82izNfJa,permanentId.ilike.doQMRg82izNfJa',
        );
    });

    it('builds an equivalent permanent-id filter for every letter casing', () => {
        const lowerCaseFilter = buildAgentNameOrPermanentIdFilter('doqmrg82iznfja');
        const upperCaseFilter = buildAgentNameOrPermanentIdFilter('DOQMRG82IZNFJA');

        // Note: PostgreSQL `ilike` compares case-insensitively, so both filters resolve to the same agent.
        expect(lowerCaseFilter).toContain('permanentId.ilike.doqmrg82iznfja');
        expect(upperCaseFilter).toContain('permanentId.ilike.DOQMRG82IZNFJA');
    });

    it('url-encodes values so that spaces and punctuation cannot break the filter syntax', () => {
        expect(buildAgentNameOrPermanentIdFilter('AI Team')).toBe('agentName.eq.AI%20Team,permanentId.ilike.AI%20Team');
    });

    it('escapes `LIKE` wildcard characters in the permanent-id branch', () => {
        // Note: `%`, `_` and `\` are escaped (and then url-encoded) so a name is matched literally.
        expect(buildAgentNameOrPermanentIdFilter('50%_off')).toBe(
            'agentName.eq.50%25_off,permanentId.ilike.50%5C%25%5C_off',
        );
    });
});

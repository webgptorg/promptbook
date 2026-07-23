import { buildAgentNameOrPermanentIdFilter } from './buildAgentNameOrPermanentIdFilter';

describe('buildAgentNameOrPermanentIdFilter', () => {
    it('matches the agent name exactly and the permanent id case-insensitively', () => {
        expect(buildAgentNameOrPermanentIdFilter('doQMRg82izNfJa')).toBe(
            'agentName.eq.doQMRg82izNfJa,permanentId.ilike.doQMRg82izNfJa',
        );
    });

    it('url-encodes reserved characters so the filter syntax is preserved', () => {
        expect(buildAgentNameOrPermanentIdFilter('AI Team')).toBe(
            'agentName.eq.AI%20Team,permanentId.ilike.AI%20Team',
        );
    });

    it('escapes SQL LIKE wildcards in the permanent id pattern so they are matched literally', () => {
        // Note: `%` -> `\%`, `_` -> `\_` and then url-encoded (`\` -> `%5C`, `%` -> `%25`)
        expect(buildAgentNameOrPermanentIdFilter('a_b%c')).toBe(
            'agentName.eq.a_b%25c,permanentId.ilike.a%5C_b%5C%25c',
        );
    });

    it('escapes backslashes in the permanent id pattern', () => {
        expect(buildAgentNameOrPermanentIdFilter('a\\b')).toBe('agentName.eq.a%5Cb,permanentId.ilike.a%5C%5Cb');
    });
});

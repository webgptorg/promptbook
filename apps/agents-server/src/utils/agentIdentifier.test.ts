import { buildAgentNameOrIdFilter, isSameAgentPermanentId, resolveAgentRouteIdentifier } from './agentIdentifier';

describe('agentIdentifier', () => {
    describe('resolveAgentRouteIdentifier', () => {
        it('prefers the permanent id over the agent name', () => {
            expect(resolveAgentRouteIdentifier({ agentName: 'Lawyer', permanentId: 'doQMRg82izNfJa' })).toBe(
                'doQMRg82izNfJa',
            );
        });

        it('falls back to the agent name when no permanent id is present', () => {
            expect(resolveAgentRouteIdentifier({ agentName: 'Lawyer', permanentId: null })).toBe('Lawyer');
        });
    });

    describe('buildAgentNameOrIdFilter', () => {
        it('matches the permanent id case-insensitively via ilike', () => {
            expect(buildAgentNameOrIdFilter('doQMRg82izNfJa')).toBe(
                'agentName.eq.doQMRg82izNfJa,permanentId.ilike.doQMRg82izNfJa',
            );
        });
    });

    describe('isSameAgentPermanentId', () => {
        it('treats permanent ids that differ only in case as equal', () => {
            expect(isSameAgentPermanentId('doQMRg82izNfJa', 'DOQMRG82IZNFJA')).toBe(true);
            expect(isSameAgentPermanentId('doQMRg82izNfJa', 'doqmrg82iznfja')).toBe(true);
        });

        it('does not match different permanent ids', () => {
            expect(isSameAgentPermanentId('doQMRg82izNfJa', 'someOtherId1234')).toBe(false);
        });

        it('returns false when either identifier is missing', () => {
            expect(isSameAgentPermanentId(null, 'doQMRg82izNfJa')).toBe(false);
            expect(isSameAgentPermanentId('doQMRg82izNfJa', undefined)).toBe(false);
            expect(isSameAgentPermanentId('', 'doQMRg82izNfJa')).toBe(false);
        });
    });
});

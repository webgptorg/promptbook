import { findAllProjectEntities } from './findAllProjectEntities';

describe('findAllProjectEntities', () => {
    it('includes script exports when requested', async () => {
        const entities = await findAllProjectEntities({ includeScripts: true, allowDuplicateNames: true });

        expect(entities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'runAgentMessages',
                }),
                expect.objectContaining({
                    name: 'verifyPrompts',
                }),
            ]),
        );
    });
});

// Note: [⚫] Code for repository script [findAllProjectEntities.test](scripts/utils/findAllProjectEntities.test.ts) should never be published in any package

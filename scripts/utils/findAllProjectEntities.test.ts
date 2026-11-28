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

    it('includes app exports when requested', async () => {
        const entities = await findAllProjectEntities({
            isApplicationSourceIncluded: true,
            allowDuplicateNames: true,
        });

        expect(entities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'DEFAULT_LOCAL_AGENT_RUNNER_MAX_FAILED_ATTEMPTS',
                }),
                expect.objectContaining({
                    name: 'DEFAULT_LOCAL_AGENT_RUNNER_MAX_PARALLEL_MESSAGES',
                }),
            ]),
        );
    });
});

// Note: [⚫] Code for repository script [findAllProjectEntities.test](scripts/utils/findAllProjectEntities.test.ts) should never be published in any package

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CORE_AGENT_EXPLANATION_BY_AGENT_NAME, GENERIC_CORE_AGENT_EXPLANATION, resolveCoreAgentExplanation } from './coreAgentExplanations';
import {
    loadBundledAgentIdentities,
    resolveMissingCoreAgentNames,
    type BundledAgentIdentity,
} from './resolveDefaultAgentsStatus';

/**
 * Builds a minimal bundled identity fixture.
 */
function createIdentityFixture(agentName: string): BundledAgentIdentity {
    return { agentName, title: agentName, expectedAgentHash: `${agentName}-hash` };
}

describe('resolveMissingCoreAgentNames', () => {
    it('returns the core agent names that are not present', () => {
        const coreIdentities = [createIdentityFixture('adam'), createIdentityFixture('teacher')];

        expect(resolveMissingCoreAgentNames(coreIdentities, ['adam'])).toEqual(['teacher']);
        expect(resolveMissingCoreAgentNames(coreIdentities, ['adam', 'teacher'])).toEqual([]);
        expect(resolveMissingCoreAgentNames(coreIdentities, [])).toEqual(['adam', 'teacher']);
    });
});

describe('resolveCoreAgentExplanation', () => {
    it('returns the curated explanation for a known core agent regardless of casing', () => {
        expect(resolveCoreAgentExplanation('adam')).toBe(CORE_AGENT_EXPLANATION_BY_AGENT_NAME.adam);
        expect(resolveCoreAgentExplanation('Adam')).toBe(CORE_AGENT_EXPLANATION_BY_AGENT_NAME.adam);
    });

    it('falls back to the generic explanation for an unknown core agent', () => {
        expect(resolveCoreAgentExplanation('some-unlisted-core-agent')).toBe(GENERIC_CORE_AGENT_EXPLANATION);
    });
});

describe('loadBundledAgentIdentities', () => {
    let temporaryDirectory: string;
    let defaultAgentsDirectory: string;

    beforeEach(() => {
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-bundled-identities-'));
        defaultAgentsDirectory = join(temporaryDirectory, 'default-agents');
        mkdirSync(join(defaultAgentsDirectory, '.core'), { recursive: true });
    });

    afterEach(() => {
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    it('parses the name, title, and expected hash of the bundled default and core books', async () => {
        writeFileSync(
            join(defaultAgentsDirectory, 'alpha.book'),
            'Alpha Agent\n\nPERSONA You answer alpha questions.\nCLOSED\n',
            'utf-8',
        );
        writeFileSync(
            join(defaultAgentsDirectory, '.core', 'adam.book'),
            'Adam\nMETA VISIBILITY PRIVATE\n\nPERSONA You are helpful.\nCLOSED\n',
            'utf-8',
        );

        const identities = await loadBundledAgentIdentities({ defaultAgentDirectory: defaultAgentsDirectory });

        expect(identities.defaultAgents).toHaveLength(1);
        expect(identities.defaultAgents[0]).toMatchObject({ agentName: 'alpha-agent', title: 'Alpha Agent' });
        expect(identities.defaultAgents[0]!.expectedAgentHash).toEqual(expect.any(String));
        expect(identities.defaultAgents[0]!.expectedAgentHash.length).toBeGreaterThan(0);

        expect(identities.coreAgents).toHaveLength(1);
        expect(identities.coreAgents[0]).toMatchObject({ agentName: 'adam', title: 'Adam' });
    });
});

import { buildAgentGitEnv, buildAgentGitSigningFlag, printAgentGitIdentityTipIfNeeded } from './agentGitIdentity';

/**
 * Coding-agent environment variables covered by these tests.
 */
const AGENT_GIT_ENV_NAMES = [
    'CODING_AGENT_GIT_NAME',
    'CODING_AGENT_GIT_EMAIL',
    'CODING_AGENT_GIT_SIGNING_KEY',
    'CODING_AGENT_GPG_KEY_ID',
] as const;

/**
 * One coding-agent environment variable name used in these tests.
 */
type AgentGitEnvName = (typeof AGENT_GIT_ENV_NAMES)[number];

/**
 * Original coding-agent environment values captured before the test suite mutates them.
 */
const ORIGINAL_AGENT_GIT_ENV: Readonly<Record<AgentGitEnvName, string | undefined>> = {
    CODING_AGENT_GIT_NAME: process.env.CODING_AGENT_GIT_NAME,
    CODING_AGENT_GIT_EMAIL: process.env.CODING_AGENT_GIT_EMAIL,
    CODING_AGENT_GIT_SIGNING_KEY: process.env.CODING_AGENT_GIT_SIGNING_KEY,
    CODING_AGENT_GPG_KEY_ID: process.env.CODING_AGENT_GPG_KEY_ID,
};

describe('agentGitIdentity', () => {
    afterEach(() => {
        restoreAgentGitEnv();
        jest.restoreAllMocks();
    });

    it('uses dedicated coding-agent git identity when all dedicated variables are configured', () => {
        setAgentGitEnv({
            CODING_AGENT_GIT_NAME: 'Promptbook Coding Agent',
            CODING_AGENT_GIT_EMAIL: 'coding-agent@promptbook.studio',
            CODING_AGENT_GIT_SIGNING_KEY: 'agent-signing-key',
            CODING_AGENT_GPG_KEY_ID: undefined,
        });

        expect(buildAgentGitEnv()).toEqual({
            GIT_AUTHOR_NAME: 'Promptbook Coding Agent',
            GIT_AUTHOR_EMAIL: 'coding-agent@promptbook.studio',
            GIT_COMMITTER_NAME: 'Promptbook Coding Agent',
            GIT_COMMITTER_EMAIL: 'coding-agent@promptbook.studio',
        });
        expect(buildAgentGitSigningFlag()).toBe('--gpg-sign="agent-signing-key"');

        const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        printAgentGitIdentityTipIfNeeded();

        expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('accepts the legacy signing-key environment variable', () => {
        setAgentGitEnv({
            CODING_AGENT_GIT_NAME: 'Promptbook Coding Agent',
            CODING_AGENT_GIT_EMAIL: 'coding-agent@promptbook.studio',
            CODING_AGENT_GIT_SIGNING_KEY: undefined,
            CODING_AGENT_GPG_KEY_ID: 'legacy-signing-key',
        });

        expect(buildAgentGitSigningFlag()).toBe('--gpg-sign="legacy-signing-key"');
    });

    it('falls back to default git config and prints a tip when the coding-agent identity is incomplete', () => {
        setAgentGitEnv({
            CODING_AGENT_GIT_NAME: 'Promptbook Coding Agent',
            CODING_AGENT_GIT_EMAIL: 'coding-agent@promptbook.studio',
            CODING_AGENT_GIT_SIGNING_KEY: undefined,
            CODING_AGENT_GPG_KEY_ID: undefined,
        });

        expect(buildAgentGitEnv()).toBeUndefined();
        expect(buildAgentGitSigningFlag()).toBeUndefined();

        const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
        printAgentGitIdentityTipIfNeeded();

        expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
        expect(String(consoleInfoSpy.mock.calls[0]![0])).toContain('default Git config');
        expect(String(consoleInfoSpy.mock.calls[0]![0])).toContain('CODING_AGENT_GIT_NAME');
        expect(String(consoleInfoSpy.mock.calls[0]![0])).toContain('CODING_AGENT_GIT_SIGNING_KEY');
        expect(String(consoleInfoSpy.mock.calls[0]![0])).toContain('CODING_AGENT_GPG_KEY_ID');
    });
});

/**
 * Restores coding-agent environment variables to the values captured before the tests started.
 */
function restoreAgentGitEnv(): void {
    setAgentGitEnv(ORIGINAL_AGENT_GIT_ENV);
}

/**
 * Applies one set of coding-agent environment variables for the current test.
 */
function setAgentGitEnv(values: Readonly<Record<AgentGitEnvName, string | undefined>>): void {
    for (const envName of AGENT_GIT_ENV_NAMES) {
        const value = values[envName];

        if (value === undefined) {
            delete process.env[envName];
        } else {
            process.env[envName] = value;
        }
    }
}

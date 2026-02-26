/**
 * Environment variable that configures the name used for agent commits.
 */
const AGENT_GIT_NAME_ENV = 'CODING_AGENT_GIT_NAME';

/**
 * Environment variable that configures the email used for agent commits.
 */
const AGENT_GIT_EMAIL_ENV = 'CODING_AGENT_GIT_EMAIL';

/**
 * Environment variable that configures the signing key used for agent commits.
 */
const AGENT_GIT_SIGNING_KEY_ENV = 'CODING_AGENT_GIT_SIGNING_KEY';

/**
 * Git identity details that must drive commits created by the coding agent.
 */
export type AgentGitIdentity = {
    readonly name: string;
    readonly email: string;
    readonly signingKey: string;
};

let cachedIdentity: AgentGitIdentity | undefined;

/**
 * Reads the required agent identity values from the environment and remembers them for the lifetime of the script.
 */
export function getAgentGitIdentity(): AgentGitIdentity {
    if (cachedIdentity) {
        return cachedIdentity;
    }

    const name = readRequiredEnvValue(AGENT_GIT_NAME_ENV);
    const email = readRequiredEnvValue(AGENT_GIT_EMAIL_ENV);
    const signingKey = readRequiredEnvValue(AGENT_GIT_SIGNING_KEY_ENV);

    cachedIdentity = { name, email, signingKey };
    return cachedIdentity;
}

/**
 * Builds the environment overrides that ensure git commits use the agent identity instead of the primary user.
 */
export function buildAgentGitEnv(identity = getAgentGitIdentity()): Record<string, string> {
    return {
        GIT_AUTHOR_NAME: identity.name,
        GIT_AUTHOR_EMAIL: identity.email,
        GIT_COMMITTER_NAME: identity.name,
        GIT_COMMITTER_EMAIL: identity.email,
    };
}

/**
 * Produces the git commit flag that enforces signing with the configured agent key.
 */
export function buildAgentGitSigningFlag(identity = getAgentGitIdentity()): string {
    return `--gpg-sign="${identity.signingKey}"`;
}

/**
 * Reads a required environment variable and fails fast with a helpful message if it is missing.
 */
function readRequiredEnvValue(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(
            `Missing required environment variable ${name}. ` +
                'Set CODING_AGENT_GIT_NAME, CODING_AGENT_GIT_EMAIL, ' +
                'and CODING_AGENT_GIT_SIGNING_KEY before running the coding agent.',
        );
    }

    return value;
}

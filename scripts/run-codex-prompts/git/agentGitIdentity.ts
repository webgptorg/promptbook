/**
 * Environment variable that configures the agent commit user name.
 */
const ENV_GIT_NAME = 'CODING_AGENT_GIT_NAME';

/**
 * Environment variable that configures the agent commit user email.
 */
const ENV_GIT_EMAIL = 'CODING_AGENT_GIT_EMAIL';

/**
 * Environment variable that configures the agent commit signing key ID.
 */
const ENV_GPG_KEY = 'CODING_AGENT_GPG_KEY_ID';

/**
 * Optional environment variable to override the GPG program that signs commits.
 */
const ENV_GPG_PROGRAM = 'CODING_AGENT_GPG_PROGRAM';

/**
 * Represents the Git identity that should be used for agent-written commits.
 */
export type AgentGitIdentity = {
    name: string;
    email: string;
    signingKey: string;
    gpgProgram?: string;
};

/**
 * Reads an environment variable and fails if it was not configured.
 */
function readRequiredEnvVar(envVar: string, description: string): string {
    const value = process.env[envVar];
    if (!value) {
        throw new Error(
            `Missing ${description}. Set ${envVar} when running the coding agent (for example via .env or your shell).`,
        );
    }

    return value;
}

/**
 * Builds the agent git identity from configured environment variables.
 */
export function getAgentGitIdentity(): AgentGitIdentity {
    return {
        name: readRequiredEnvVar(ENV_GIT_NAME, 'agent commit name'),
        email: readRequiredEnvVar(ENV_GIT_EMAIL, 'agent commit email'),
        signingKey: readRequiredEnvVar(ENV_GPG_KEY, 'agent GPG key ID'),
        gpgProgram: process.env[ENV_GPG_PROGRAM],
    };
}

/**
 * Returns the environment overrides that keep author/committer metadata aligned with the agent identity.
 */
export function buildAgentGitEnv(identity: AgentGitIdentity): Record<string, string> {
    return {
        GIT_AUTHOR_NAME: identity.name,
        GIT_AUTHOR_EMAIL: identity.email,
        GIT_COMMITTER_NAME: identity.name,
        GIT_COMMITTER_EMAIL: identity.email,
    };
}

/**
 * Builds the git -c overrides that apply the agent identity and enable GPG signing.
 */
export function buildAgentGitConfigArgs(identity: AgentGitIdentity): string[] {
    const configEntries: Array<[string, string]> = [
        ['user.name', identity.name],
        ['user.email', identity.email],
        ['user.signingkey', identity.signingKey],
        ['commit.gpgsign', 'true'],
    ];

    if (identity.gpgProgram) {
        configEntries.push(['gpg.program', identity.gpgProgram]);
    }

    return configEntries.flatMap(([key, value]) => ['-c', `${key}=${value}`]);
}

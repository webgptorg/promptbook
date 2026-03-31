import colors from 'colors';
import { spaceTrim } from 'spacetrim';

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
 * Legacy environment variable that can also provide the signing key used for agent commits.
 */
const AGENT_GPG_KEY_ID_ENV = 'CODING_AGENT_GPG_KEY_ID';

/**
 * Environment variables accepted for the coding-agent Git signing key.
 */
const AGENT_GIT_SIGNING_KEY_ENV_ALIASES = [AGENT_GIT_SIGNING_KEY_ENV, AGENT_GPG_KEY_ID_ENV] as const;

/**
 * Git identity details that drive commits created by the coding agent.
 */
export type AgentGitIdentity = {
    readonly name: string;
    readonly email: string;
    readonly signingKey: string;
};

/**
 * Reads the optional agent identity values from the environment.
 *
 * Falls back to the user's default Git configuration whenever the dedicated coding-agent
 * identity is only partially configured.
 */
export function getAgentGitIdentity(): AgentGitIdentity | undefined {
    const name = readOptionalEnvValue(AGENT_GIT_NAME_ENV);
    const email = readOptionalEnvValue(AGENT_GIT_EMAIL_ENV);
    const signingKey = readOptionalSigningKeyValue();

    if (!name || !email || !signingKey) {
        return undefined;
    }

    return { name, email, signingKey };
}

/**
 * Builds the environment overrides that ensure git commits use the dedicated agent identity instead of the primary user.
 */
export function buildAgentGitEnv(identity = getAgentGitIdentity()): Record<string, string> | undefined {
    if (!identity) {
        return undefined;
    }

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
export function buildAgentGitSigningFlag(identity = getAgentGitIdentity()): string | undefined {
    if (!identity) {
        return undefined;
    }

    return `--gpg-sign="${identity.signingKey}"`;
}

/**
 * Prints a one-time style tip when coding-agent commits fall back to the user's default Git configuration.
 */
export function printAgentGitIdentityTipIfNeeded(): void {
    if (getAgentGitIdentity()) {
        return;
    }

    console.info(
        colors.cyan(spaceTrim(`
            Tip: \`ptbk coder run\` used your default Git config because the coding-agent identity environment variables are incomplete.
            For cleaner commit history, set \`CODING_AGENT_GIT_NAME\`, \`CODING_AGENT_GIT_EMAIL\`, and either \`CODING_AGENT_GIT_SIGNING_KEY\` or \`CODING_AGENT_GPG_KEY_ID\`.
        `)),
    );
}

/**
 * Reads one optional environment variable and trims it when present.
 */
function readOptionalEnvValue(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value || undefined;
}

/**
 * Reads the first configured signing-key environment variable.
 */
function readOptionalSigningKeyValue(): string | undefined {
    for (const envName of AGENT_GIT_SIGNING_KEY_ENV_ALIASES) {
        const value = readOptionalEnvValue(envName);
        if (value) {
            return value;
        }
    }

    return undefined;
}

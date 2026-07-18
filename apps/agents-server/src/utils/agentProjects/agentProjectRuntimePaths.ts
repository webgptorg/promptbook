import { join, resolve } from 'path';

/**
 * Environment variable overriding the persisted project-runtime registry file.
 */
export const PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV = 'PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE';

/**
 * Environment variable overriding the persisted project-domain registry file.
 */
export const PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV = 'PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE';

/**
 * Environment variable read by the VPS installer for newline-separated project domains.
 */
export const PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV = 'PTBK_AGENT_PROJECT_DOMAINS_FILE';

/**
 * Directory under the Agents Server data root used for project runtime state.
 */
const AGENT_PROJECT_RUNTIME_STATE_DIRECTORY_NAME = 'agent-projects';

/**
 * Persisted runtime registry filename.
 */
const AGENT_PROJECT_RUNTIME_REGISTRY_FILE_NAME = 'runtimes.json';

/**
 * Persisted domain assignment registry filename.
 */
const AGENT_PROJECT_DOMAIN_REGISTRY_FILE_NAME = 'domains.json';

/**
 * Installer-facing project domains filename.
 */
const AGENT_PROJECT_DOMAINS_FILE_NAME = 'domains.txt';

/**
 * Resolves the durable state root used by agent project runtime managers.
 *
 * @returns Absolute directory path.
 */
export function resolveAgentProjectRuntimeStateRoot(): string {
    const configuredDataDirectory = process.env.PTBK_DATA_DIR?.trim();

    if (configuredDataDirectory) {
        return join(resolve(configuredDataDirectory), AGENT_PROJECT_RUNTIME_STATE_DIRECTORY_NAME);
    }

    const configuredInstallDirectory = process.env.PTBK_INSTALL_DIR?.trim();

    if (configuredInstallDirectory) {
        return join(resolve(configuredInstallDirectory), '.promptbook', AGENT_PROJECT_RUNTIME_STATE_DIRECTORY_NAME);
    }

    return join(process.cwd(), '.promptbook', AGENT_PROJECT_RUNTIME_STATE_DIRECTORY_NAME);
}

/**
 * Resolves the JSON registry file used for assigned and running runtimes.
 *
 * @returns Absolute file path.
 */
export function resolveAgentProjectRuntimeRegistryFilePath(): string {
    const configuredFilePath = process.env[PTBK_AGENT_PROJECT_RUNTIME_REGISTRY_FILE_ENV]?.trim();

    if (configuredFilePath) {
        return resolve(configuredFilePath);
    }

    return join(resolveAgentProjectRuntimeStateRoot(), AGENT_PROJECT_RUNTIME_REGISTRY_FILE_NAME);
}

/**
 * Resolves the JSON registry file used for stable project-domain assignments.
 *
 * @returns Absolute file path.
 */
export function resolveAgentProjectDomainRegistryFilePath(): string {
    const configuredFilePath = process.env[PTBK_AGENT_PROJECT_DOMAIN_REGISTRY_FILE_ENV]?.trim();

    if (configuredFilePath) {
        return resolve(configuredFilePath);
    }

    return join(resolveAgentProjectRuntimeStateRoot(), AGENT_PROJECT_DOMAIN_REGISTRY_FILE_NAME);
}

/**
 * Resolves the newline-separated domain file consumed by the VPS installer.
 *
 * @returns Absolute file path.
 */
export function resolveAgentProjectDomainsFilePath(): string {
    const configuredFilePath = process.env[PTBK_AGENT_PROJECT_DOMAINS_FILE_ENV]?.trim();

    if (configuredFilePath) {
        return resolve(configuredFilePath);
    }

    return join(resolveAgentProjectRuntimeStateRoot(), AGENT_PROJECT_DOMAINS_FILE_NAME);
}

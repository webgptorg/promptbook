import type { AvailableEnvironmentVariables, RegisteredLlmToolStatus } from './RegisteredLlmToolsMessageContext';

/**
 * Creates the configuration-status sentence for one provider.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function createRegisteredLlmToolConfigurationStatusMessage(
    { envVariables, isFullyConfigured, isPartiallyConfigured }: RegisteredLlmToolStatus,
    env: AvailableEnvironmentVariables,
): string {
    if (isFullyConfigured) {
        return `Configured`;
    }

    if (isPartiallyConfigured) {
        return createPartiallyConfiguredStatusMessage(envVariables, env);
    }

    if (envVariables !== null) {
        return createNotConfiguredStatusMessage(envVariables);
    }

    return `Not configured`;
    // <- Note: Can not be configured via environment variables
}

/**
 * Creates the partial-configuration sentence including missing variables.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function createPartiallyConfiguredStatusMessage(
    envVariables: RegisteredLlmToolStatus['envVariables'],
    env: AvailableEnvironmentVariables,
): string {
    return `Partially confugured, missing ${listMissingEnvironmentVariables(envVariables, env).join(' + ')}`;
}

/**
 * Creates the not-configured sentence including the expected environment variables.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function createNotConfiguredStatusMessage(envVariables: RegisteredLlmToolStatus['envVariables']): string {
    return `Not configured, to configure set env ${envVariables?.join(' + ')}`;
}

/**
 * Lists environment variables that are required but currently missing.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function listMissingEnvironmentVariables(
    envVariables: RegisteredLlmToolStatus['envVariables'],
    env: AvailableEnvironmentVariables,
): Array<string> {
    return envVariables?.filter((envVariable) => env[envVariable] === undefined) || [];
}

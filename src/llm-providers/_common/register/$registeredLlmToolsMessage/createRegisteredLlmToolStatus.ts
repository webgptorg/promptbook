import type { Registered } from '../../../../utils/misc/$Register';
import type { LlmToolsMetadata } from '../LlmToolsMetadata';
import { hasRegisteredLlmToolEntry } from './hasRegisteredLlmToolEntry';
import type {
    AvailableEnvironmentVariables,
    RegisteredLlmToolEntry,
    RegisteredLlmToolStatus,
} from './RegisteredLlmToolsMessageContext';

/**
 * Builds the runtime status for one provider entry.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
export function createRegisteredLlmToolStatus({
    registeredLlmToolEntry,
    registeredMetadata,
    registeredTools,
    env,
}: {
    readonly registeredLlmToolEntry: RegisteredLlmToolEntry;
    readonly registeredMetadata: ReadonlyArray<LlmToolsMetadata>;
    readonly registeredTools: ReadonlyArray<Registered>;
    readonly env: AvailableEnvironmentVariables;
}): RegisteredLlmToolStatus {
    const availabilityStatus = createRegisteredLlmToolAvailabilityStatus(
        registeredLlmToolEntry,
        registeredMetadata,
        registeredTools,
    );
    const configurationStatus = createRegisteredLlmToolConfigurationStatus(registeredLlmToolEntry, env);

    return {
        ...registeredLlmToolEntry,
        ...availabilityStatus,
        ...configurationStatus,
    };
}

/**
 * Resolves whether the provider has metadata and a registered constructor.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function createRegisteredLlmToolAvailabilityStatus(
    registeredLlmToolEntry: RegisteredLlmToolEntry,
    registeredMetadata: ReadonlyArray<LlmToolsMetadata>,
    registeredTools: ReadonlyArray<Registered>,
): Pick<RegisteredLlmToolStatus, 'isMetadataAvailable' | 'isInstalled'> {
    return {
        isMetadataAvailable: hasRegisteredLlmToolEntry(registeredMetadata, registeredLlmToolEntry),
        isInstalled: hasRegisteredLlmToolEntry(registeredTools, registeredLlmToolEntry),
    };
}

/**
 * Resolves whether the provider has enough environment variables to be configured.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function createRegisteredLlmToolConfigurationStatus(
    { envVariables }: RegisteredLlmToolEntry,
    env: AvailableEnvironmentVariables,
): Pick<RegisteredLlmToolStatus, 'isFullyConfigured' | 'isPartiallyConfigured'> {
    return {
        isFullyConfigured: isRegisteredLlmToolFullyConfigured(envVariables, env),
        isPartiallyConfigured: isRegisteredLlmToolPartiallyConfigured(envVariables, env),
    };
}

/**
 * Checks whether all required environment variables are present for a provider.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function isRegisteredLlmToolFullyConfigured(
    envVariables: RegisteredLlmToolEntry['envVariables'],
    env: AvailableEnvironmentVariables,
): boolean {
    if (envVariables === undefined || envVariables === null) {
        return false;
    }

    return envVariables.every((envVariableName) => env[envVariableName] !== undefined);
}

/**
 * Checks whether at least one required environment variable is present for a provider.
 *
 * @private function of `$registeredLlmToolsMessage`
 */
function isRegisteredLlmToolPartiallyConfigured(
    envVariables: RegisteredLlmToolEntry['envVariables'],
    env: AvailableEnvironmentVariables,
): boolean {
    if (envVariables === undefined || envVariables === null) {
        return false;
    }

    return envVariables.some((envVariableName) => env[envVariableName] !== undefined);
}

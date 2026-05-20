import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import type { string_filename } from '../../../types/string_filename';
import type { string_markdown } from '../../../types/string_markdown';
import type { string_name } from '../../../types/string_name';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import type { Registered } from '../../../utils/misc/$Register';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { just } from '../../../utils/organization/just';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
import { $llmToolsRegister } from './$llmToolsRegister';
import type { LlmToolsMetadata } from './LlmToolsMetadata';

/**
 * Environment variables available for provider resolution.
 *
 * @private internal type of `$registeredLlmToolsMessage`
 */
type AvailableEnvironmentVariables = Record<string_name, string>;

/**
 * Mixed provider entry assembled from both provider registers.
 *
 * @private internal type of `$registeredLlmToolsMessage`
 */
type RegisteredLlmToolEntry = Registered & Partial<Pick<LlmToolsMetadata, 'title' | 'envVariables'>>;

/**
 * Provider entry enriched with runtime availability and configuration flags.
 *
 * @private internal type of `$registeredLlmToolsMessage`
 */
type RegisteredLlmToolStatus = RegisteredLlmToolEntry & {
    readonly isMetadataAvailable: boolean;
    readonly isInstalled: boolean;
    readonly isFullyConfigured: boolean;
    readonly isPartiallyConfigured: boolean;
};

/**
 * Provider register snapshots used to build the summary.
 *
 * @private internal type of `$registeredLlmToolsMessage`
 */
type RegisteredLlmToolRegisters = {
    readonly registeredMetadata: ReadonlyArray<LlmToolsMetadata>;
    readonly registeredTools: ReadonlyArray<Registered>;
};

/**
 * Message-rendering context for the registered providers summary.
 *
 * @private internal type of `$registeredLlmToolsMessage`
 */
type RegisteredLlmToolsMessageContext = {
    readonly env: AvailableEnvironmentVariables;
    readonly llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>;
    readonly usedEnvMessage: string;
    readonly isRunningInNode: boolean;
};

/**
 * Path to the `.env` file which was used to configure LLM tools
 *
 * Note: `$` is used to indicate that this variable is changed by side effect in `$provideLlmToolsConfigurationFromEnv` through `$setUsedEnvFilename`
 */
let $usedEnvFilename: string | null = null;

/**
 * Pass the `.env` file which was used to configure LLM tools
 *
 * Note: `$` is used to indicate that this variable is making side effect
 *
 * @private internal log of `$provideLlmToolsConfigurationFromEnv` and `$registeredLlmToolsMessage`
 */
export function $setUsedEnvFilename(filepath: string_filename): $side_effect {
    $usedEnvFilename = filepath;
}

/**
 * Creates a message with all registered LLM tools
 *
 * Note: This function is used to create a (error) message when there is no constructor for some LLM provider
 *
 * @private internal function of `createLlmToolsFromConfiguration` and `$provideLlmToolsFromEnv`
 */
export function $registeredLlmToolsMessage(): string_markdown {
    const registeredLlmToolsMessageContext = createRegisteredLlmToolsMessageContext();

    if (registeredLlmToolsMessageContext.llmToolStatuses.length === 0) {
        return renderNoRegisteredLlmToolsMessage(registeredLlmToolsMessageContext.usedEnvMessage);
    }

    return renderRegisteredLlmToolsMessage(registeredLlmToolsMessageContext);
}

/**
 * Collects all state needed to render the provider summary.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createRegisteredLlmToolsMessageContext(): RegisteredLlmToolsMessageContext {
    const isRunningInNode = $isRunningInNode();
    const env = getAvailableEnvironmentVariables(isRunningInNode);
    const registeredLlmToolRegisters = getRegisteredLlmToolRegisters();

    return {
        env,
        llmToolStatuses: listRegisteredLlmToolStatuses(registeredLlmToolRegisters, env),
        usedEnvMessage: createUsedEnvMessage(),
        isRunningInNode,
    };
}

/**
 * Reads environment variables relevant for provider configuration.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function getAvailableEnvironmentVariables(isRunningInNode: boolean): AvailableEnvironmentVariables {
    if (isRunningInNode) {
        return process.env as AvailableEnvironmentVariables;
        // <- TODO: [⚛] Some DRY way how to get to `process.env` and pass it into functions - ACRY search for `env`
    }

    return {};
}

/**
 * Takes stable snapshots of both LLM provider registers.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function getRegisteredLlmToolRegisters(): RegisteredLlmToolRegisters {
    return {
        registeredMetadata: $llmToolsMetadataRegister.list(),
        registeredTools: $llmToolsRegister.list(),
    };
}

/**
 * Lists provider entries enriched with installation and configuration state.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function listRegisteredLlmToolStatuses(
    { registeredMetadata, registeredTools }: RegisteredLlmToolRegisters,
    env: AvailableEnvironmentVariables,
): Array<RegisteredLlmToolStatus> {
    return listRegisteredLlmToolEntries(registeredMetadata, registeredTools).map((registeredLlmToolEntry) =>
        createRegisteredLlmToolStatus({ registeredLlmToolEntry, registeredMetadata, registeredTools, env }),
    );
}

/**
 * Merges provider entries from the metadata and constructor registers.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function listRegisteredLlmToolEntries(
    registeredMetadata: ReadonlyArray<LlmToolsMetadata>,
    registeredTools: ReadonlyArray<Registered>,
): Array<RegisteredLlmToolEntry> {
    const registeredLlmToolEntries = new Map<string, RegisteredLlmToolEntry>();

    for (const { title, packageName, className, envVariables } of registeredMetadata) {
        addRegisteredLlmToolEntry(registeredLlmToolEntries, { title, packageName, className, envVariables });
    }

    for (const { packageName, className } of registeredTools) {
        addRegisteredLlmToolEntry(registeredLlmToolEntries, { packageName, className });
    }

    return [...registeredLlmToolEntries.values()];
}

/**
 * Adds a provider entry only when the provider is not already present.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function addRegisteredLlmToolEntry(
    registeredLlmToolEntries: Map<string, RegisteredLlmToolEntry>,
    registeredLlmToolEntry: RegisteredLlmToolEntry,
): void {
    const registeredLlmToolEntryKey = createRegisteredLlmToolEntryKey(registeredLlmToolEntry);

    if (registeredLlmToolEntries.has(registeredLlmToolEntryKey)) {
        return;
    }

    registeredLlmToolEntries.set(registeredLlmToolEntryKey, registeredLlmToolEntry);
}

/**
 * Creates a deduplication key for a provider entry.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createRegisteredLlmToolEntryKey({ packageName, className }: Registered): string {
    return `${packageName}::${className}`;
}

/**
 * Checks whether the given provider entry already exists in the target register list.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function hasRegisteredLlmToolEntry(
    registeredLlmToolEntries: ReadonlyArray<Registered>,
    registeredLlmToolEntry: Registered,
): boolean {
    const registeredLlmToolEntryKey = createRegisteredLlmToolEntryKey(registeredLlmToolEntry);

    return registeredLlmToolEntries.some(
        (listedRegisteredLlmToolEntry) =>
            createRegisteredLlmToolEntryKey(listedRegisteredLlmToolEntry) === registeredLlmToolEntryKey,
    );
}

/**
 * Builds the runtime status for one provider entry.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createRegisteredLlmToolStatus({
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
 * @private internal function of `$registeredLlmToolsMessage`
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
 * @private internal function of `$registeredLlmToolsMessage`
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
 * @private internal function of `$registeredLlmToolsMessage`
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
 * @private internal function of `$registeredLlmToolsMessage`
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

/**
 * Renders the fallback message for environments with no registered providers.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function renderNoRegisteredLlmToolsMessage(usedEnvMessage: string): string_markdown {
    return spaceTrim(
        (block) => `
            No LLM providers are available.

            ${block(usedEnvMessage)}
      `,
    );
}

/**
 * Renders the full provider status summary.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function renderRegisteredLlmToolsMessage({
    env,
    llmToolStatuses,
    usedEnvMessage,
    isRunningInNode,
}: RegisteredLlmToolsMessageContext): string_markdown {
    return spaceTrim(
        (block) => `

            ${block(usedEnvMessage)}

            Relevant environment variables:
            ${block(renderRelevantEnvironmentVariables(env, llmToolStatuses))}

            Available LLM providers are:
            ${block(renderAvailableProviders(llmToolStatuses, env, isRunningInNode))}
        `,
    );
}

/**
 * Renders the list of environment variables used by at least one registered provider.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function renderRelevantEnvironmentVariables(
    env: AvailableEnvironmentVariables,
    llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>,
): string {
    return listRelevantEnvironmentVariables(env, llmToolStatuses)
        .map((envVariableName) => `- \`${envVariableName}\``)
        .join('\n');
}

/**
 * Lists environment variables that are both present and used by at least one provider.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function listRelevantEnvironmentVariables(
    env: AvailableEnvironmentVariables,
    llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>,
): Array<string> {
    return Object.keys(env).filter((envVariableName) =>
        llmToolStatuses.some(({ envVariables }) => envVariables?.includes(envVariableName)),
    );
}

/**
 * Renders all provider lines in the status summary.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function renderAvailableProviders(
    llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>,
    env: AvailableEnvironmentVariables,
    isRunningInNode: boolean,
): string {
    return llmToolStatuses
        .map((llmToolStatus, index) => renderAvailableProvider(llmToolStatus, index, env, isRunningInNode))
        .join('\n');
}

/**
 * Renders one provider line in the status summary.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function renderAvailableProvider(
    llmToolStatus: RegisteredLlmToolStatus,
    index: number,
    env: AvailableEnvironmentVariables,
    isRunningInNode: boolean,
): string {
    const providerMessage = createAvailableProviderMessage(llmToolStatus, index, env);

    if (!isRunningInNode) {
        return providerMessage;
    }

    return colorizeAvailableProviderMessage(providerMessage, llmToolStatus);
}

/**
 * Creates the plain-text provider line before optional colorization.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createAvailableProviderMessage(
    llmToolStatus: RegisteredLlmToolStatus,
    index: number,
    env: AvailableEnvironmentVariables,
): string {
    const { title, packageName, className } = llmToolStatus;
    const providerStatusMessages = createProviderStatusMessages(llmToolStatus, env);

    return spaceTrim(`
        ${index + 1}) **${title}** \`${className}\` from \`${packageName}\`
            ${providerStatusMessages.join('; ')}
    `);
}

/**
 * Creates the install and configuration fragments for one provider line.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createProviderStatusMessages(
    llmToolStatus: RegisteredLlmToolStatus,
    env: AvailableEnvironmentVariables,
): Array<string> {
    return [createInstallationStatusMessage(llmToolStatus), createConfigurationStatusMessage(llmToolStatus, env)];
}

/**
 * Creates the installation-status sentence for one provider.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createInstallationStatusMessage({
    isMetadataAvailable,
    isInstalled,
}: Pick<RegisteredLlmToolStatus, 'isMetadataAvailable' | 'isInstalled'>): string {
    const installationStatusKey = createInstallationStatusKey(isMetadataAvailable, isInstalled);

    if (just(false)) {
        // Keep for prettier formatting
    }

    switch (installationStatusKey) {
        case 'missing-metadata-and-installation':
            // TODO: [�][�] Maybe do allow to do auto-install if package not registered and not found
            return `Not installed and no metadata, looks like a unexpected behavior`;

        case 'metadata-without-installation':
            // TODO: [�][�]
            return `Not installed`;

        case 'installation-without-metadata':
            return `No metadata but installed, looks like a unexpected behavior`;

        case 'metadata-and-installation':
            return `Installed`;

        default:
            return `unknown state, looks like a unexpected behavior`;
    }
}

/**
 * Creates a stable installation-state key from metadata and constructor availability.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createInstallationStatusKey(isMetadataAvailable: boolean, isInstalled: boolean): string {
    if (!isMetadataAvailable && !isInstalled) {
        return 'missing-metadata-and-installation';
    }

    if (isMetadataAvailable && !isInstalled) {
        return 'metadata-without-installation';
    }

    if (!isMetadataAvailable && isInstalled) {
        return 'installation-without-metadata';
    }

    if (isMetadataAvailable && isInstalled) {
        return 'metadata-and-installation';
    }

    return 'unknown';
}

/**
 * Creates the configuration-status sentence for one provider.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createConfigurationStatusMessage(
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
 * @private internal function of `$registeredLlmToolsMessage`
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
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createNotConfiguredStatusMessage(envVariables: RegisteredLlmToolStatus['envVariables']): string {
    return `Not configured, to configure set env ${envVariables?.join(' + ')}`;
}

/**
 * Lists environment variables that are required but currently missing.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function listMissingEnvironmentVariables(
    envVariables: RegisteredLlmToolStatus['envVariables'],
    env: AvailableEnvironmentVariables,
): Array<string> {
    return envVariables?.filter((envVariable) => env[envVariable] === undefined) || [];
}

/**
 * Applies the same terminal coloring rules as the original summary renderer.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function colorizeAvailableProviderMessage(
    providerMessage: string,
    { isInstalled, isFullyConfigured, isPartiallyConfigured }: RegisteredLlmToolStatus,
): string {
    if (isInstalled && isFullyConfigured) {
        return colors.green(providerMessage);
    }

    if (isInstalled && isPartiallyConfigured) {
        return colors.yellow(providerMessage);
    }

    return colors.gray(providerMessage);
}

/**
 * Creates the `.env` origin sentence used in the summary header.
 *
 * @private internal function of `$registeredLlmToolsMessage`
 */
function createUsedEnvMessage(): string {
    return $usedEnvFilename === null ? `Unknown \`.env\` file` : `Used \`.env\` file:\n${$usedEnvFilename}`;
}

// TODO: [®] DRY Register logic
// TODO: [🧠][⚛] Maybe pass env as argument

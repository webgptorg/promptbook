import type { string_name } from '../../../../types/string_name';
import type { Registered } from '../../../../utils/misc/$Register';
import type { LlmToolsMetadata } from '../LlmToolsMetadata';

/**
 * Environment variables available for provider resolution.
 *
 * @private type of `$registeredLlmToolsMessage`
 */
export type AvailableEnvironmentVariables = Record<string_name, string>;

/**
 * Mixed provider entry assembled from both provider registers.
 *
 * @private type of `$registeredLlmToolsMessage`
 */
export type RegisteredLlmToolEntry = Registered & Partial<Pick<LlmToolsMetadata, 'title' | 'envVariables'>>;

/**
 * Provider entry enriched with runtime availability and configuration flags.
 *
 * @private type of `$registeredLlmToolsMessage`
 */
export type RegisteredLlmToolStatus = RegisteredLlmToolEntry & {
    readonly isMetadataAvailable: boolean;
    readonly isInstalled: boolean;
    readonly isFullyConfigured: boolean;
    readonly isPartiallyConfigured: boolean;
};

/**
 * Provider register snapshots used to build the summary.
 *
 * @private type of `$registeredLlmToolsMessage`
 */
export type RegisteredLlmToolRegisters = {
    readonly registeredMetadata: ReadonlyArray<LlmToolsMetadata>;
    readonly registeredTools: ReadonlyArray<Registered>;
};

/**
 * Message-rendering context for the registered providers summary.
 *
 * @private type of `$registeredLlmToolsMessage`
 */
export type RegisteredLlmToolsMessageContext = {
    readonly env: AvailableEnvironmentVariables;
    readonly llmToolStatuses: ReadonlyArray<RegisteredLlmToolStatus>;
    readonly usedEnvMessage: string;
    readonly isRunningInNode: boolean;
};

import type { string_name, string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { LlmToolsConfiguration } from './LlmToolsConfiguration';

/**
 * @@@
 *
 * @@@ `LlmToolsMetadata` vs `LlmToolsConfiguration` vs `LlmToolsOptions` (vs `Registered`)
 */
export type LlmToolsMetadata = Registered & {
    /**
     * @@@
     */
    readonly title: string_title;

    /**
     * List of environment variables that can be used to configure the provider
     *
     * If `[]`, empty array, it means that the provider is available automatically without any configuration
     * If `null`, it means that the provider can not be configured via environment variables
     */
    readonly envVariables: ReadonlyArray<string_name & string_SCREAMING_CASE> | null;

    /**
     * @@@
     */
    getBoilerplateConfiguration(): LlmToolsConfiguration[number];

    /**
     * @@@
     */
    createConfigurationFromEnv(env: Record<string_name, string>): LlmToolsConfiguration[number] | null;
};

/**
 * TODO: Add configuration schema and maybe some documentation link
 * TODO: Maybe constrain LlmToolsConfiguration[number] by generic to ensure that `createConfigurationFromEnv` and `getBoilerplateConfiguration` always create same `packageName` and `className`
 * TODO: [®] DRY Register logic
 */

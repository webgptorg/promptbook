import type { string_name } from '../../types/typeAliases';
import type { string_title } from '../../types/typeAliases';
import type { Registered } from '../../utils/$Register';
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
    title: string_title;

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
 */

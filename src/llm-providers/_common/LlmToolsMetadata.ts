import { string_name, string_title } from '../../types/typeAliases';
import { Registered } from '../../utils/Register';
import { LlmToolsConfiguration } from './LlmToolsConfiguration';

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
    createConfigurationFromEnv(env: Record<string_name,string>): LlmToolsConfiguration[number] | null;

    /**
     * @@@
     */
    getBoilerplateConfiguration(): LlmToolsConfiguration[number];
};

/**
 * TODO: Add configuration schema and maybe some documentation link
 * TODO: Maybe constrain LlmToolsConfiguration[number] by generic to ensure that `createConfigurationFromEnv` and `getBoilerplateConfiguration` always create same `packageName` and `className`
 */

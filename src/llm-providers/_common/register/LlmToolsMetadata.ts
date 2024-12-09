import type { string_SCREAMING_CASE } from '../../../utils/normalization/normalizeTo_SCREAMING_CASE';
import type { string_name } from '../../../types/typeAliases';
import type { string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
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
     * @@@
     */
    readonly envVariables: ReadonlyArray<string_name & string_SCREAMING_CASE>;

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

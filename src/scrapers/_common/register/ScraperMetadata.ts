import type { string_name, string_title } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import type { ScraperConfiguration } from './ScraperConfiguration';

/**
 * @@@
 *
 * @@@ `ScraperMetadata` vs `ScraperConfiguration` vs `ScraperOptions` (vs `Registered`)
 */
export type ScraperMetadata = Registered & {
    /**
     * @@@
     */
    title: string_title;

    /**
     * @@@
     */
    getBoilerplateConfiguration(): ScraperConfiguration[number];

    /**
     * @@@
     */
    createConfigurationFromEnv(env: Record<string_name, string>): ScraperConfiguration[number] | null;
};

/**
 * TODO: Add configuration schema and maybe some documentation link
 * TODO: Maybe constrain ScraperConfiguration[number] by generic to ensure that `createConfigurationFromEnv` and `getBoilerplateConfiguration` always create same `packageName` and `className`
 * TODO: [®] DRY Register logic
 */

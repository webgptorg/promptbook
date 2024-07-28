import { PromptResultUsage } from '../../execution/PromptResult';
import { string_promptbook_version } from '../../version';
import { number_id, string_date_iso8601 } from '../typeAliases';

export type PreparationJson = {
    /**
     * Incremental ID of the preparation
     */
    readonly id: number_id;

    /**
     * Date and time of the preparation
     */
    readonly date: string_date_iso8601;

    /**
     * Version of the promptbook used for the preparation
     */
    readonly promptbookVersion: string_promptbook_version;

    /**
     * Usage of the prompt execution
     */
    readonly modelUsage: PromptResultUsage;
};

/**
 * TODO: Maybe put here used `modelName`
 */

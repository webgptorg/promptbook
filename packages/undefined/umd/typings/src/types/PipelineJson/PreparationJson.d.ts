import type { PromptResultUsage } from '../../execution/PromptResultUsage';
import type { string_promptbook_version } from '../../version';
import type { number_id } from '../typeAliases';
export type PreparationJson = {
    /**
     * Incremental ID of the preparation
     */
    readonly id: number_id;
    /**
     * Version of the promptbook used for the preparation
     */
    readonly promptbookVersion: string_promptbook_version;
    /**
     * Usage of the prompt execution
     */
    readonly usage: PromptResultUsage;
};
/**
 * TODO: [🍙] Make some standart order of json properties
 * TODO: Maybe put here used `modelName`
 * TODO: [🍥] When using `date` it changes all samples .ptbk.json files each time so until some more elegant solution omit the time from prepared pipeline
 */

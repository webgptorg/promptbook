import type { JsonFileCommon } from './JsonFileCommon';
import type { PromptTemplateJson } from './PromptTemplateJson';
import type { PromptTemplateParameterJson } from './PromptTemplateParameterJson';

/**
 * Promptbook is the **core concept of this library**.
 * It represents a series of prompt templates chained together to form a pipeline / one big prompt template with input and result parameters.
 *
 * @see https://github.com/webgptorg/promptbook#promptbook
 */
export type PromptbookJson = JsonFileCommon & {
    readonly type: 'PROMPTBOOK';

    /**
     * Set of variables that are used across the pipeline
     */
    readonly parameters: Array<PromptTemplateParameterJson>;

    /**
     * Sequence of prompt templates that are chained together to form a pipeline
     */
    readonly promptTemplates: Array<PromptTemplateJson>;
};

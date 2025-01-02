import type { ErrorJson } from '../../../errors/utils/ErrorJson';
import type { PipelineJson } from '../../../pipeline/PipelineJson/PipelineJson';
import type { string_date_iso8601 } from '../../../types/typeAliases';

/**
 * Represents a single pipeline in PromptbookStudio
 *
 * This is simple extension of PipelineJson with additional metadata
 * Note: There are two similar entities:
 *       1) Type (interface) `PipelineEditableSerialized` which represents just data in database
 *       2) Class `PipelineEditable` which implements `PipelineEditableSerialized` and adds error handling and editing capabilities
 *
 * @public exported from `@promptbook/editable`
 */
export type PipelineEditableSerialized = PipelineJson & {
    /**
     * When was the pipeline created
     */
    readonly createdAt: string_date_iso8601;

    /**
     * When was the pipeline last modified
     */
    readonly updatedAt: string_date_iso8601 | null;

    /*
    TODO: [▫]
    /**
     * Unique identifier of the pipeline
     *
     * Note: In PromptbookStudio it is required
     * /
    readonly pipelineUrl: string_pipeline_url;
    */

    /**
     * Known errors to transfer to new PipelineEditable
     */
    readonly knownErrors: Array<ErrorJson>;
};

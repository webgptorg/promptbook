import { ErrorJson, PipelineJson, string_date_iso8601, string_pipeline_url } from '../../../_packages/types.index';
import { PipelineString } from '../../../pipeline/PipelineString';

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

    /**
     * Unique identifier of the pipeline
     *
     * Note: In PromptbookStudio it is required
     */
    readonly pipelineUrl: string_pipeline_url;

    /**
     * Backup of the pipeline string
     *
     * Note: This is present ONLY if pipelineString can not be automatically converted into json (i.e. compilePipeline throws an error)
     *       In other words, this is just a BACKUP of pipeline which will be deleted whener pipeline is valid again
     */
    readonly pipelineString: PipelineString | string | null; // <- TODO: !!!!!! This should be native in `PipelineJson`

    /**
     * Known errors to transfer to new PipelineEditable
     */
    readonly knownErrors: Array<ErrorJson>;
};

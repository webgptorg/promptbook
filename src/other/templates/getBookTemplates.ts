import type { string_formfactor_name } from '../../formfactors/_common/string_formfactor_name';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { string_pipeline_url } from '../../types/typeAliases';
import { getTemplatesPipelineCollection } from './getTemplatesPipelineCollection';

/**
 * @@@
 *
 * @singleton
 * @private internal cache of `getBookTemplate`
 */
export let pipelines: Array<PipelineJson> | null = null;

/**
 * Get template for new book
 *
 * @param formfactorName - optional filter for FORMFACTOR - get only pipelines for this formfactor
 * @returns list of pipelines
 * @public exported from `@promptbook/templates`
 */
export function getBookTemplates(formfactorName?: string_formfactor_name): ReadonlyArray<PipelineJson> {
    if (pipelines === null) {
        const collection = getTemplatesPipelineCollection();
        const pipelineUrls = collection.listPipelines() as ReadonlyArray<string_pipeline_url>; // <- Note: [0] Function `listPipelines` is sync because `templatesPipelineCollection` is `SimplePipelineCollection`
        pipelines = pipelineUrls.map(
            (pipelineUrl) => collection?.getPipelineByUrl(pipelineUrl) as PipelineJson /* <- Note: [0] */,
        );
    }

    if (formfactorName === undefined) {
        return pipelines;
    } else {
        return pipelines.filter((pipeline) => pipeline.formfactorName === formfactorName);
    }
}

/**
 * TODO: Unit test
 * TODO: [🧠] Which is the best place for this function
 * TODO: !!!!!! For GENERIC template ensure at least one pipeline is present for typescript in `getBookTemplates`
 */

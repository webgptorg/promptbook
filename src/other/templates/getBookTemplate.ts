import type { string_formfactor_name } from '../../formfactors/_common/string_formfactor_name';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TODO_any } from '../../utils/organization/TODO_any';
import { getTemplatesPipelineCollection } from './getTemplatesPipelineCollection';

/**
 * Get template for new book
 *
 * @public exported from `@promptbook/templates`
 */
export async function getBookTemplate(formfactorName: string_formfactor_name): PipelineJson | null {
    const templatesPipelineCollection = getTemplatesPipelineCollection();

    const pipelineJson =
        (
            {
                templatesPipelineCollection,

                // TODO: !!!!!! Add other formfactors when they are ready
                // chatbotBook,
                // translatorBook,
                // sheetsBook,
                // generatorBook,
            } as TODO_any
        ) /* TODO: as Record<`${Lowercase<string_formfactor_name>}Book`, PipelineString> */[
            `${formfactorName.toLowerCase()}Book`
        ] || null;

    return pipelineJson;
}

/**
 * TODO: [🧠] Which is the best place for this function
 * TODO: !!!!!! `book string template notation
 */

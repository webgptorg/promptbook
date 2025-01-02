// !!!!!! Import real templates library> import genericBook from '../../book/books/templates/generic.book.md';

import genericBook from '../../../examples/pipelines/01-simple.book.json';
import type { string_formfactor_name } from '../../formfactors/_common/string_formfactor_name';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * Get template for new book
 *
 * @public exported from `@promptbook/templates`
 */
export function getBookTemplate(formfactorName: string_formfactor_name): PipelineJson | null {
    const pipelineJson =
        (
            {
                genericBook,

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

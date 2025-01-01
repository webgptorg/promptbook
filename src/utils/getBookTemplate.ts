import genericBook from '../../book/books/templates/generic.book.md';

import type { string_formfactor_name } from '../formfactors/_common/string_formfactor_name';
import type { TODO_any } from './organization/TODO_any';
import type { PipelineString } from '../pipeline/PipelineString';

/**
 * Get template for new book
 *
 * @public exported from `@promptbook/templates`
 */
export function getBookTemplate(formfactorName: string_formfactor_name): PipelineString | null {
    const pipelineString =
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

    return pipelineString;
}

/**
 * TODO: [🧠] Which is the best place for this function
 * TODO: `book string template notation
 */

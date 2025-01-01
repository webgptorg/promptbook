import { any_TODO } from '../../../../webgpt/promptbook-studio/src/utils/typeAliases';
import genericBook from '../../book/books/templates/generic.book.md';

import { string_formfactor_name } from '../_packages/types.index';
import { PipelineString } from '../pipeline/PipelineString';

/**
 * Get template for new book
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
            } as any_TODO
        ) /* TODO: as Record<`${Lowercase<string_formfactor_name>}Book`, PipelineString> */[
            `${formfactorName.toLowerCase()}Book`
        ] || null;

    return pipelineString;
}

/**
 * TODO: [🧠] Which is the best place for this function
 * TODO: `book string template notation
 */

import spaceTrim from 'spacetrim';
import type { PipelineCollection } from '../../collection/PipelineCollection';
import { NotFoundError } from '../../errors/NotFoundError';
import { UnexpectedError } from '../../errors/UnexpectedError';
import type { string_formfactor_name } from '../../formfactors/_common/string_formfactor_name';
import type { PipelineJson } from '../../pipeline/PipelineJson/PipelineJson';
import { getTemplatesPipelineCollection } from './getTemplatesPipelineCollection';

/**
 * @@@
 *
 * @singleton
 * @private internal cache of `getBookTemplate`
 */
export let templatesPipelineCollection: PipelineCollection | null = null;

/**
 * Get template for new book
 *
 * @public exported from `@promptbook/templates`
 */
export function getBookTemplate(formfactorName: string_formfactor_name): PipelineJson {
    if (templatesPipelineCollection === null) {
        templatesPipelineCollection = getTemplatesPipelineCollection();
    }

    try {
        return templatesPipelineCollection.getPipelineByUrl(
            `https://github.com/webgptorg/book/blob/main/books/templates/${formfactorName.toLowerCase()}.book.md`,
        ) as PipelineJson; // <- Note: !!!!!! `SimplePipelineCollection`
    } catch (error) {
        if (!(error instanceof NotFoundError)) {
            throw error;
        }

        throw new UnexpectedError(
            spaceTrim(
                (block) => `
                    Template for formfactor "${formfactorName}" not found

                    Original \`NotFoundError\`:
                    ${block(error.stack || error.message)}


                `,
            ),
        );
    }
}

/**
 * TODO: !!!!!! Test
 * TODO: [🧠] Which is the best place for this function
 * TODO: !!!!!! `book string template notation
 */

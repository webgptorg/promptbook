import spaceTrim from 'spacetrim';
import type { PromptbookJson } from '../types/PromptbookJson/PromptbookJson';
import type { PromptbookString } from '../types/PromptbookString';

export function promptbookJsonToString(promptbookJson: PromptbookJson): PromptbookString {
    return spaceTrim(
        (block) => `

            # ${block(promptbookJson.title)}

        `,
    ) as PromptbookString;
}

/**
 * TODO: !!! Implement
 * TODO: !!! Annotate and warn
 * TODO: !!! Test + test together with promptbookStringToJson
 */

/**
 * Function trimCodeBlock will trim starting and ending code block from the string if it is present.
 *
 * Note: This is usefull for post-processing of the result of the chat LLM model
 *       when the model wraps the result in the (markdown) code block.
 *
 */

import spaceTrim from 'spacetrim';

export function trimCodeBlock(value: string): string {
    value = spaceTrim(value);
    if (!/^```[a-z]*(.*)```$/is.test(value)) {
        return value;
    }

    value = value.replace(/^```[a-z]*/i, '');
    value = value.replace(/```$/i, '');
    value = spaceTrim(value);

    return value;
}

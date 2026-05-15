import { spaceTrim } from 'spacetrim';

/**
 * Removes fenced code blocks when deriving human-readable section descriptions.
 *
 * @private internal utility of `extractPipelineDescription`
 */
const DESCRIPTION_CODE_BLOCK_REGEXP = /^```.*^```/gms;

/**
 * Removes blockquote lines when deriving human-readable section descriptions.
 *
 * @private internal utility of `extractPipelineDescription`
 */
const DESCRIPTION_BLOCKQUOTE_REGEXP = /^>.*$/gm;

/**
 * Removes list items and return statements when deriving human-readable section descriptions.
 *
 * @private internal utility of `extractPipelineDescription`
 */
const DESCRIPTION_LIST_ITEM_REGEXP = /^(?:(?:-)|(?:\d\))|(?:`?->))\s+.*$/gm;

/**
 * Extracts the plain-text description from a head or task section body.
 *
 * @private internal utility of `parsePipeline`
 */
export function extractPipelineDescription(sectionContent: string): string | undefined {
    let description = sectionContent;

    description = description.split(DESCRIPTION_CODE_BLOCK_REGEXP).join('');
    description = description.split(DESCRIPTION_BLOCKQUOTE_REGEXP).join('');
    description = description.split(DESCRIPTION_LIST_ITEM_REGEXP).join('');
    description = spaceTrim(description);

    if (description === '') {
        return undefined;
    }

    return description;
}

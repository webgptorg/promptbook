import spaceTrim from 'spacetrim';
import { extractBlock } from '../../postprocessing/utils/extractBlock';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import { trimCodeBlock } from '../../utils/markdown/trimCodeBlock';
import { trimEndOfCodeBlock } from '../../utils/markdown/trimEndOfCodeBlock';
import { capitalize } from '../../utils/normalization/capitalize';
import { decapitalize } from '../../utils/normalization/decapitalize';
import { nameToUriPart } from '../../utils/normalization/nameToUriPart';
import { nameToUriParts } from '../../utils/normalization/nameToUriParts';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { normalizeTo_PascalCase } from '../../utils/normalization/normalizeTo_PascalCase';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { normalizeTo_snake_case } from '../../utils/normalization/normalizeTo_snake_case';
import { normalizeWhitespaces } from '../../utils/normalization/normalizeWhitespaces';
import { parseKeywordsFromString } from '../../utils/normalization/parseKeywordsFromString';
import { removeDiacritics } from '../../utils/normalization/removeDiacritics';
import { removeEmojis } from '../../utils/normalization/removeEmojis';
import { removeQuotes } from '../../utils/normalization/removeQuotes';
import { unwrapResult } from '../../utils/normalization/unwrapResult';

const parseKeywords = (input: string) =>
    // TODO: DRY [🍯]
    Array.from(parseKeywordsFromString(input)).join(
        ', ',
    ); /* <- TODO: [🧠] What is the best format comma list, bullet list,...? */

// TODO: DRY [🍯]
const trim = (str: string) => str.trim();

// TODO: DRY [🍯]
const reverse = (str: string) => str.split('').reverse().join('');

/**
 * Collection of utility functions that can be used for post-processing model outputs.
 * These functions help transform, extract, or format the raw model responses.
 *
 * These utilities range from simple string manipulations to markdown processing
 * and formatting functions for specific types of output.
 *
 * @public exported from `@promptbook/javascript`
 */
export const POSTPROCESSING_FUNCTIONS = {
    spaceTrim,
    removeQuotes,
    unwrapResult,
    trimEndOfCodeBlock,
    trimCodeBlock,
    trim,
    reverse,
    removeEmojis,
    prettifyMarkdown,
    capitalize,
    decapitalize,
    nameToUriPart,
    nameToUriParts,
    removeDiacritics,
    normalizeWhitespaces,
    normalizeToKebabCase,
    normalizeTo_camelCase,
    normalizeTo_snake_case,
    normalizeTo_PascalCase,
    parseKeywords,
    normalizeTo_SCREAMING_CASE,
    extractBlock, // <- [🍓] Remove balast in all other functions, use this one as example
};

/**
 * TODO: DRY [🍯], [🧠] Where should be POSTPROCESSING_FUNCTIONS located and how it should be named
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

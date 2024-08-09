import spaceTrim from 'spacetrim';
import { extractBlock } from '../../postprocessing/utils/extractBlock';
import { prettifyMarkdown } from '../../utils/markdown/prettifyMarkdown';
import { capitalize } from '../../utils/normalization/capitalize';
import { decapitalize } from '../../utils/normalization/decapitalize';
import { nameToUriPart } from '../../utils/normalization/nameToUriPart';
import { nameToUriParts } from '../../utils/normalization/nameToUriParts';
import { normalizeToKebabCase } from '../../utils/normalization/normalize-to-kebab-case';
import { normalizeTo_PascalCase } from '../../utils/normalization/normalizeTo_PascalCase';
import { normalizeTo_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';
import { normalizeTo_camelCase } from '../../utils/normalization/normalizeTo_camelCase';
import { normalizeTo_snake_case } from '../../utils/normalization/normalizeTo_snake_case';
import { normalizeWhitespaces } from '../../utils/normalization/normalizeWhitespaces';
import { removeDiacritics } from '../../utils/normalization/removeDiacritics';
import { removeEmojis } from '../../utils/removeEmojis';
import { removeQuotes } from '../../utils/removeQuotes';
import { trimCodeBlock } from '../../utils/trimCodeBlock';
import { trimEndOfCodeBlock } from '../../utils/trimEndOfCodeBlock';
import { unwrapResult } from '../../utils/unwrapResult';
/**
 * @@@
 *
 * @public exported from `@promptbook/execute-javascript`
 */
export declare const POSTPROCESSING_FUNCTIONS: {
    spaceTrim: typeof spaceTrim;
    removeQuotes: typeof removeQuotes;
    unwrapResult: typeof unwrapResult;
    trimEndOfCodeBlock: typeof trimEndOfCodeBlock;
    trimCodeBlock: typeof trimCodeBlock;
    trim: (str: string) => string;
    reverse: (str: string) => string;
    removeEmojis: typeof removeEmojis;
    prettifyMarkdown: typeof prettifyMarkdown;
    capitalize: typeof capitalize;
    decapitalize: typeof decapitalize;
    nameToUriPart: typeof nameToUriPart;
    nameToUriParts: typeof nameToUriParts;
    removeDiacritics: typeof removeDiacritics;
    normalizeWhitespaces: typeof normalizeWhitespaces;
    normalizeToKebabCase: typeof normalizeToKebabCase;
    normalizeTo_camelCase: typeof normalizeTo_camelCase;
    normalizeTo_snake_case: typeof normalizeTo_snake_case;
    normalizeTo_PascalCase: typeof normalizeTo_PascalCase;
    parseKeywords: (input: string) => string;
    normalizeTo_SCREAMING_CASE: typeof normalizeTo_SCREAMING_CASE;
    extractBlock: typeof extractBlock;
};
/**
 * TODO: DRY [🍯], [🧠] Where should be POSTPROCESSING_FUNCTIONS located and how it should be named
 */

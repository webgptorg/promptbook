// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/utils`

import { SMALL_NUMBER, VALUE_STRINGS } from '../config';
import { renderPromptbookMermaid } from '../conversion/prettify/renderPipelineMermaidOptions';
import { deserializeError } from '../errors/utils/deserializeError';
import { serializeError } from '../errors/utils/serializeError';
import { forEachAsync } from '../execution/utils/forEachAsync';
import { isValidCsvString } from '../formats/csv/utils/isValidCsvString';
import { isValidJsonString } from '../formats/json/utils/isValidJsonString';
import { jsonParse } from '../formats/json/utils/jsonParse';
import { isValidXmlString } from '../formats/xml/utils/isValidXmlString';
import { prompt, promptTemplate } from '../pipeline/prompt-notation';
import { $detectRuntimeEnvironment } from '../utils/environment/$detectRuntimeEnvironment';
import { $isRunningInBrowser } from '../utils/environment/$isRunningInBrowser';
import { $isRunningInJest } from '../utils/environment/$isRunningInJest';
import { $isRunningInNode } from '../utils/environment/$isRunningInNode';
import { $isRunningInWebWorker } from '../utils/environment/$isRunningInWebWorker';
import { CHARACTERS_PER_STANDARD_LINE, LINES_PER_STANDARD_PAGE } from '../utils/expectation-counters/constants';
import { countCharacters } from '../utils/expectation-counters/countCharacters';
import { countLines } from '../utils/expectation-counters/countLines';
import { countPages } from '../utils/expectation-counters/countPages';
import { countParagraphs } from '../utils/expectation-counters/countParagraphs';
import { countSentences, splitIntoSentences } from '../utils/expectation-counters/countSentences';
import { countWords } from '../utils/expectation-counters/countWords';
import { CountUtils } from '../utils/expectation-counters/index';
import { $getCurrentDate } from '../utils/misc/$getCurrentDate';
import { computeHash } from '../utils/misc/computeHash';
import { debounce } from '../utils/misc/debounce';
import { linguisticHash } from '../utils/misc/linguisticHash';
import { parseNumber } from '../utils/misc/parseNumber';
import { capitalize } from '../utils/normalization/capitalize';
import { decapitalize } from '../utils/normalization/decapitalize';
import { DIACRITIC_VARIANTS_LETTERS } from '../utils/normalization/DIACRITIC_VARIANTS_LETTERS';
import type { Keywords, string_keyword } from '../utils/normalization/IKeywords';
import { isValidKeyword } from '../utils/normalization/isValidKeyword';
import { nameToUriPart } from '../utils/normalization/nameToUriPart';
import { nameToUriParts } from '../utils/normalization/nameToUriParts';
import type { string_kebab_case } from '../utils/normalization/normalize-to-kebab-case';
import { normalizeToKebabCase } from '../utils/normalization/normalize-to-kebab-case';
import { normalizeMessageText } from '../utils/normalization/normalizeMessageText';
import type { string_camelCase } from '../utils/normalization/normalizeTo_camelCase';
import { normalizeTo_camelCase } from '../utils/normalization/normalizeTo_camelCase';
import type { string_PascalCase } from '../utils/normalization/normalizeTo_PascalCase';
import { normalizeTo_PascalCase } from '../utils/normalization/normalizeTo_PascalCase';
import type { string_SCREAMING_CASE } from '../utils/normalization/normalizeTo_SCREAMING_CASE';
import { normalizeTo_SCREAMING_CASE } from '../utils/normalization/normalizeTo_SCREAMING_CASE';
import { normalizeTo_snake_case } from '../utils/normalization/normalizeTo_snake_case';
import { normalizeWhitespaces } from '../utils/normalization/normalizeWhitespaces';
import { orderJson } from '../utils/normalization/orderJson';
import { parseKeywords } from '../utils/normalization/parseKeywords';
import { parseKeywordsFromString } from '../utils/normalization/parseKeywordsFromString';
import { removeDiacritics } from '../utils/normalization/removeDiacritics';
import { removeEmojis } from '../utils/normalization/removeEmojis';
import { removeQuotes } from '../utils/normalization/removeQuotes';
import { searchKeywords } from '../utils/normalization/searchKeywords';
import { suffixUrl } from '../utils/normalization/suffixUrl';
import { titleToName } from '../utils/normalization/titleToName';
import { unwrapResult } from '../utils/normalization/unwrapResult';
import { spaceTrim } from '../utils/organization/spaceTrim';
import { extractParameterNames } from '../utils/parameters/extractParameterNames';
import { numberToString } from '../utils/parameters/numberToString';
import { isPromptMarked, removePromptMarker, templateParameters } from '../utils/parameters/templateParameters';
import { valueToString } from '../utils/parameters/valueToString';
import { $deepFreeze } from '../utils/serialization/$deepFreeze';
import { checkSerializableAsJson } from '../utils/serialization/checkSerializableAsJson';
import { clonePipeline } from '../utils/serialization/clonePipeline';
import { deepClone } from '../utils/serialization/deepClone';
import { exportJson } from '../utils/serialization/exportJson';
import { isSerializableAsJson } from '../utils/serialization/isSerializableAsJson';
import { jsonStringsToJsons } from '../utils/serialization/jsonStringsToJsons';
import { serializeToPromptbookJavascript } from '../utils/serialization/serializeToPromptbookJavascript';
import { difference } from '../utils/sets/difference';
import { intersection } from '../utils/sets/intersection';
import { union } from '../utils/sets/union';
import { isValidEmail } from '../utils/validators/email/isValidEmail';
import { isRootPath } from '../utils/validators/filePath/isRootPath';
import { isValidFilePath } from '../utils/validators/filePath/isValidFilePath';
import { isValidJavascriptName } from '../utils/validators/javascriptName/isValidJavascriptName';
import { isValidPromptbookVersion } from '../utils/validators/semanticVersion/isValidPromptbookVersion';
import { isValidSemanticVersion } from '../utils/validators/semanticVersion/isValidSemanticVersion';
import { isHostnameOnPrivateNetwork } from '../utils/validators/url/isHostnameOnPrivateNetwork';
import { isUrlOnPrivateNetwork } from '../utils/validators/url/isUrlOnPrivateNetwork';
import { isValidAgentUrl } from '../utils/validators/url/isValidAgentUrl';
import { isValidPipelineUrl } from '../utils/validators/url/isValidPipelineUrl';
import { isValidUrl } from '../utils/validators/url/isValidUrl';
import { isValidUuid } from '../utils/validators/uuid/isValidUuid';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';

// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };

// Note: Entities of the `@promptbook/utils`
export {
    $deepFreeze,
    $detectRuntimeEnvironment,
    $getCurrentDate,
    $isRunningInBrowser,
    $isRunningInJest,
    $isRunningInNode,
    $isRunningInWebWorker,
    capitalize,
    CHARACTERS_PER_STANDARD_LINE,
    checkSerializableAsJson,
    clonePipeline,
    computeHash,
    countCharacters,
    countLines,
    countPages,
    countParagraphs,
    countSentences,
    CountUtils,
    countWords,
    debounce,
    decapitalize,
    deepClone,
    deserializeError,
    DIACRITIC_VARIANTS_LETTERS,
    difference,
    exportJson,
    extractParameterNames,
    forEachAsync,
    intersection,
    isHostnameOnPrivateNetwork,
    isPromptMarked,
    isRootPath,
    isSerializableAsJson,
    isUrlOnPrivateNetwork,
    isValidAgentUrl,
    isValidCsvString,
    isValidEmail,
    isValidFilePath,
    isValidJavascriptName,
    isValidJsonString,
    isValidKeyword,
    isValidPipelineUrl,
    isValidPromptbookVersion,
    isValidSemanticVersion,
    isValidUrl,
    isValidUuid,
    isValidXmlString,
    jsonParse,
    jsonStringsToJsons,
    LINES_PER_STANDARD_PAGE,
    linguisticHash,
    nameToUriPart,
    nameToUriParts,
    normalizeMessageText,
    normalizeTo_camelCase,
    normalizeTo_PascalCase,
    normalizeTo_SCREAMING_CASE,
    normalizeTo_snake_case,
    normalizeToKebabCase,
    normalizeWhitespaces,
    numberToString,
    orderJson,
    parseKeywords,
    parseKeywordsFromString,
    parseNumber,
    prompt,
    promptTemplate,
    removeDiacritics,
    removeEmojis,
    removePromptMarker,
    removeQuotes,
    renderPromptbookMermaid,
    searchKeywords,
    serializeError,
    serializeToPromptbookJavascript,
    SMALL_NUMBER,
    spaceTrim,
    splitIntoSentences,
    suffixUrl,
    templateParameters,
    titleToName,
    union,
    unwrapResult,
    VALUE_STRINGS,
    valueToString,
};
export type { Keywords, string_camelCase, string_kebab_case, string_keyword, string_PascalCase, string_SCREAMING_CASE };

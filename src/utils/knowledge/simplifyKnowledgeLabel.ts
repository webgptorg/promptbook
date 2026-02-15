/**
 * Maximum number of characters shown for a simplified knowledge label.
 *
 * @private utility of knowledge/source chip rendering
 */
const MAX_KNOWLEDGE_LABEL_LENGTH = 20;

/**
 * Minimum length for a segment to be considered a potential generated identifier.
 *
 * @private utility of knowledge/source chip rendering
 */
const MIN_ID_SEGMENT_LENGTH = 16;

/**
 * Minimum amount of digits inside a long alphanumeric token to strongly treat it as an ID.
 *
 * @private utility of knowledge/source chip rendering
 */
const MIN_DIGITS_FOR_STRONG_ID = 3;

/**
 * Length threshold for identifiers composed entirely of digits.
 *
 * @private utility of knowledge/source chip rendering
 */
const MIN_ALL_DIGIT_ID_LENGTH = 10;

/**
 * Minimum number of letters for confidently classifying text as human-readable.
 *
 * @private utility of knowledge/source chip rendering
 */
const MIN_HUMAN_LETTERS = 3;

/**
 * Minimum uppercase-letter ratio for long alphabetic tokens to be treated as ID-like.
 *
 * @private utility of knowledge/source chip rendering
 */
const MIN_UPPERCASE_LETTER_RATIO_FOR_ID = 0.8;

/**
 * Pattern used to remove a simple file extension from the end of a filename.
 *
 * @private utility of knowledge/source chip rendering
 */
const FILE_EXTENSION_REGEX = /\.[a-z0-9]{1,10}$/i;

/**
 * Pattern used to remove trailing separators after ID stripping.
 *
 * @private utility of knowledge/source chip rendering
 */
const TRAILING_DELIMITER_REGEX = /[-_]+$/;

/**
 * Simplifies knowledge labels for UI chips by:
 * - extracting filename from URL/path-like values,
 * - removing extension,
 * - removing trailing random ID segment when detected,
 * - truncating to 20 characters with ellipsis.
 *
 * @param label - Raw knowledge label or source value.
 * @returns Display-friendly chip label.
 * @private utility of knowledge/source chip rendering
 */
export function simplifyKnowledgeLabel(label: string): string {
    const trimmedLabel = label.trim();

    if (trimmedLabel.length === 0) {
        return label;
    }

    const fileNameCandidate = stripQueryAndHash(extractFileNameCandidate(trimmedLabel));
    const withoutExtension = removeExtension(fileNameCandidate);
    const withoutTrailingId = stripTrailingDelimiters(removeTrailingIdSegment(withoutExtension));
    const normalized = withoutTrailingId || withoutExtension || fileNameCandidate || trimmedLabel;

    return truncateKnowledgeLabel(normalized);
}

/**
 * Heuristic that classifies a short text as human-readable, identifier-like, or unknown.
 *
 * @param text - Candidate value (typically a filename segment).
 * @returns `'HUMAN'`, `'ID'`, or `'UNKNOWN'`.
 * @private utility of knowledge/source chip rendering
 */
export function isHumanOrID(text: string): 'HUMAN' | 'ID' | 'UNKNOWN' {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
        return 'UNKNOWN';
    }

    const letters = (trimmed.match(/[A-Za-z]/g) ?? []).length;
    const uppercase = (trimmed.match(/[A-Z]/g) ?? []).length;
    const lowercase = (trimmed.match(/[a-z]/g) ?? []).length;
    const digits = (trimmed.match(/\d/g) ?? []).length;
    const separators = (trimmed.match(/[\s_-]/g) ?? []).length;
    const total = trimmed.length;
    const otherCharacters = total - letters - digits - separators;
    const isAlphanumericToken = separators === 0 && otherCharacters === 0;
    const hasMixedCase = uppercase > 0 && lowercase > 0;

    if (digits === total && total >= MIN_ALL_DIGIT_ID_LENGTH) {
        return 'ID';
    }

    if (isAlphanumericToken && total >= MIN_ID_SEGMENT_LENGTH) {
        if (digits >= MIN_DIGITS_FOR_STRONG_ID) {
            return 'ID';
        }

        if (hasMixedCase) {
            return 'ID';
        }

        if (letters > 0 && uppercase / letters >= MIN_UPPERCASE_LETTER_RATIO_FOR_ID) {
            return 'ID';
        }
    }

    if (letters >= MIN_HUMAN_LETTERS && (separators > 0 || lowercase >= uppercase)) {
        return 'HUMAN';
    }

    if (letters >= MIN_HUMAN_LETTERS && digits <= 2 && !hasMixedCase) {
        return 'HUMAN';
    }

    return 'UNKNOWN';
}

/**
 * Extracts a file-like tail segment from URL/path strings when possible.
 *
 * @param value - Raw label value.
 * @returns The extracted filename candidate.
 * @private utility of knowledge/source chip rendering
 */
function extractFileNameCandidate(value: string): string {
    try {
        const parsedUrl = new URL(value);
        const decodedPath = decodeUriComponentSafe(parsedUrl.pathname);
        const pathSegments = decodedPath.split('/').filter(Boolean);
        const lastPathSegment = pathSegments[pathSegments.length - 1];

        if (lastPathSegment) {
            return lastPathSegment;
        }

        return parsedUrl.hostname || value;
    } catch {
        const pathSegments = value.split(/[\\/]/).filter(Boolean);
        const lastPathSegment = pathSegments[pathSegments.length - 1] || value;
        return decodeUriComponentSafe(lastPathSegment);
    }
}

/**
 * Removes a basic file extension from a filename candidate.
 *
 * @param value - Filename candidate.
 * @returns Filename without extension.
 * @private utility of knowledge/source chip rendering
 */
function removeExtension(value: string): string {
    return value.replace(FILE_EXTENSION_REGEX, '');
}

/**
 * Removes query-string and hash fragments from URL-like tails.
 *
 * @param value - URL/path tail.
 * @returns Cleaned value without query/hash.
 * @private utility of knowledge/source chip rendering
 */
function stripQueryAndHash(value: string): string {
    const queryIndex = value.indexOf('?');
    const hashIndex = value.indexOf('#');
    const cutIndexCandidates = [queryIndex, hashIndex].filter((index) => index >= 0);

    if (cutIndexCandidates.length === 0) {
        return value;
    }

    const firstCutIndex = Math.min(...cutIndexCandidates);
    return value.slice(0, firstCutIndex);
}

/**
 * Removes trailing ID-like segments separated by `-` or `_`.
 *
 * @param value - Filename candidate without extension.
 * @returns Filename candidate without trailing ID segments.
 * @private utility of knowledge/source chip rendering
 */
function removeTrailingIdSegment(value: string): string {
    let current = value;
    let separatorIndex = Math.max(current.lastIndexOf('-'), current.lastIndexOf('_'));

    while (separatorIndex > 0) {

        const suffixCandidate = current.slice(separatorIndex + 1);
        if (isHumanOrID(suffixCandidate) !== 'ID') {
            return current;
        }

        current = current.slice(0, separatorIndex);
        separatorIndex = Math.max(current.lastIndexOf('-'), current.lastIndexOf('_'));
    }

    return current;
}

/**
 * Trims dangling separators left after dropping trailing ID segments.
 *
 * @param value - Filename candidate.
 * @returns Cleaned filename candidate.
 * @private utility of knowledge/source chip rendering
 */
function stripTrailingDelimiters(value: string): string {
    return value.replace(TRAILING_DELIMITER_REGEX, '').trim();
}

/**
 * Truncates labels to the chip limit and appends ellipsis when needed.
 *
 * @param value - Knowledge label candidate.
 * @returns Final chip label.
 * @private utility of knowledge/source chip rendering
 */
function truncateKnowledgeLabel(value: string): string {
    if (value.length <= MAX_KNOWLEDGE_LABEL_LENGTH) {
        return value;
    }

    return `${value.slice(0, MAX_KNOWLEDGE_LABEL_LENGTH)}...`;
}

/**
 * Safely decodes URI-encoded strings.
 *
 * @param value - Possibly encoded text.
 * @returns Decoded text, or original value when decoding fails.
 * @private utility of knowledge/source chip rendering
 */
function decodeUriComponentSafe(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Maximum number of characters shown for a knowledge chip label (without extension or trailing IDs).
 */
const MAX_KNOWLEDGE_LABEL_LENGTH = 20;

/**
 * Minimum length for a segment to be considered a random identifier.
 */
const MIN_ID_SEGMENT_LENGTH = 16;

/**
 * Minimum digit ratio required to treat a segment as a random identifier.
 */
const MIN_ID_DIGIT_RATIO = 0.12;

/**
 * Digit ratio threshold that qualifies a mixed-character segment as an identifier even without many uppercase letters.
 */
const MIN_RANDOM_ID_DIGIT_RATIO = 0.35;

/**
 * Uppercase ratio required when the candidate contains fewer digits but exploits casing for randomness.
 */
const MIN_UPPERCASE_RATIO_FOR_ID = 0.4;

/**
 * Length threshold for identifiers composed entirely of digits (e.g., long numeric hashes).
 */
const MIN_ALL_DIGIT_ID_LENGTH = 10;

/**
 * Minimum number of letters to confidently treat a segment as human-friendly.
 */
const MIN_HUMAN_LETTERS = 3;

/**
 * Regex that matches strings ending with a file extension (e.g., `document.pdf`).
 */
const FILE_NAME_WITH_EXTENSION_REGEX = /[^\\/]+?\\.[a-z0-9]{1,6}$/i;

/**
 * Regex used to trim trailing hyphens/underscores after identifier removal.
 */
const TRAILING_DELIMITER_REGEX = /[-_]+$/;

/**
 * Simplifies knowledge file labels for display by stripping extensions, trailing identifiers, and truncating.
 *
 * @param label - The original capability label (typically a filename).
 * @returns A shortened label suitable for knowledge chips.
 * @private
 */
export function simplifyKnowledgeLabel(label: string): string {
    const trimmedLabel = label.trim();

    if (trimmedLabel.length === 0) {
        return label;
    }

    const fileName = extractFileName(trimmedLabel);

    if (!FILE_NAME_WITH_EXTENSION_REGEX.test(fileName)) {
        return label;
    }

    const withoutExtension = removeExtension(fileName);
    const withoutId = stripTrailingDelimiters(removeTrailingIdSegment(withoutExtension));
    const normalized = withoutId.length > 0 ? withoutId : withoutExtension;

    if (normalized.length === 0) {
        return label;
    }

    if (normalized.length <= MAX_KNOWLEDGE_LABEL_LENGTH) {
        return normalized;
    }

    return `${normalized.slice(0, MAX_KNOWLEDGE_LABEL_LENGTH)}...`;
}

/**
 * Heuristic that classifies a short string as human-readable, an identifier, or unknown.
 *
 * @param text - Candidate string (e.g., a filename segment).
 * @returns `'HUMAN'`, `'ID'`, or `'UNKNOWN'` depending on the observed pattern.
 * @private
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
    const total = trimmed.length;
    const nonAlphanumeric = total - letters - digits;
    const containsSeparator = /[\s_-]/.test(trimmed);

    const digitRatio = digits / total;
    const uppercaseRatio = uppercase / total;
    const isUppercaseDominant = uppercase >= lowercase;

    if (
        total >= MIN_ID_SEGMENT_LENGTH &&
        nonAlphanumeric === 0 &&
        isUppercaseDominant &&
        digitRatio >= MIN_ID_DIGIT_RATIO &&
        (uppercaseRatio >= MIN_UPPERCASE_RATIO_FOR_ID || digitRatio >= MIN_RANDOM_ID_DIGIT_RATIO)
    ) {
        return 'ID';
    }

    if (digits >= MIN_ALL_DIGIT_ID_LENGTH && letters === 0) {
        return 'ID';
    }

    if (letters >= MIN_HUMAN_LETTERS && digits <= 2) {
        return 'HUMAN';
    }

    if ((containsSeparator || lowercase > uppercase) && letters > 0) {
        return 'HUMAN';
    }

    return 'UNKNOWN';
}

/**
 * Extracts the filename part from a path or URL-like string.
 *
 * @param value - Raw label that might contain folders or CDN paths.
 * @returns The last path segment.
 */
function extractFileName(value: string): string {
    const segments = value.split(/[\\/]/);
    return segments[segments.length - 1] || value;
}

/**
 * Removes the file extension from a filename.
 *
 * @param fileName - Filename that includes an extension.
 * @returns Filename without the extension.
 */
function removeExtension(fileName: string): string {
    return fileName.replace(/\.[^./]+$/, '');
}

/**
 * Removes a trailing identifier segment if the heuristic detects an ID-like suffix.
 *
 * @param value - Filename without an extension.
 * @returns The filename without the trailing segment if it looked like an ID.
 */
function removeTrailingIdSegment(value: string): string {
    const index = Math.max(value.lastIndexOf('-'), value.lastIndexOf('_'));

    if (index <= 0) {
        return value;
    }

    const suffixCandidate = value.slice(index + 1);

    if (isHumanOrID(suffixCandidate) === 'ID') {
        return value.slice(0, index);
    }

    return value;
}

/**
 * Trims trailing separators left after dropping identifier segments.
 *
 * @param value - Filename that may end with hyphens or underscores.
 * @returns Cleaned filename.
 */
function stripTrailingDelimiters(value: string): string {
    return value.replace(TRAILING_DELIMITER_REGEX, '').trim();
}

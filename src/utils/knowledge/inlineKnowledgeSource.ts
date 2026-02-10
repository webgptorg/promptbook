import { normalizeToKebabCase } from '../normalization/normalize-to-kebab-case';
import type { string_data_url, string_filename } from '../../types/typeAliases';

/**
 * @@@
 * 
 * @private thing of inline knowledge
 */
const INLINE_KNOWLEDGE_BASE_NAME = 'inline-knowledge';

/**
 * @@@
 * 
 * @private thing of inline knowledge
 */
const INLINE_KNOWLEDGE_EXTENSION = '.txt';

/**
 * @@@
 * 
 * @private thing of inline knowledge
 */
const DATA_URL_PREFIX = 'data:';

/**
 * @@@
 * 
 * @private thing of inline knowledge
 */
export type InlineKnowledgeSourceFile = {
    readonly filename: string_filename;
    readonly mimeType: string;
    readonly url: string_data_url;
};

/**
 * @@@
 * 
 * @private thing of inline knowledge
 */
function getFirstNonEmptyLine(content: string): string | null {
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return null;
}

/**
 * @@@
 * 
 * @private thing of inline knowledge
 */
function deriveBaseFilename(content: string): string {
    const firstLine = getFirstNonEmptyLine(content);
    if (!firstLine) {
        return INLINE_KNOWLEDGE_BASE_NAME;
    }

    const normalized = normalizeToKebabCase(firstLine);
    return normalized || INLINE_KNOWLEDGE_BASE_NAME;
}

/**
 * Creates a data URL that represents the inline knowledge content as a text file.
 * 
 * @private thing of inline knowledge
 */
export function createInlineKnowledgeSourceFile(content: string): InlineKnowledgeSourceFile {
    const trimmedContent = content.trim();
    const baseName = deriveBaseFilename(trimmedContent);
    const filename = `${baseName}${INLINE_KNOWLEDGE_EXTENSION}` as string_filename;
    const mimeType = 'text/plain';
    const base64 = Buffer.from(trimmedContent, 'utf-8').toString('base64');
    const encodedFilename = encodeURIComponent(filename);
    const url = `${DATA_URL_PREFIX}${mimeType};name=${encodedFilename};charset=utf-8;base64,${base64}` as string_data_url;

    return {
        filename,
        mimeType,
        url,
    };
}

/**
 * Checks whether the provided source string is a data URL that can be decoded.
 * 
 * @private thing of inline knowledge
 */
export function isDataUrlKnowledgeSource(source: string): source is string_data_url {
    return typeof source === 'string' && source.startsWith(DATA_URL_PREFIX);
}

/**
 * Parses a data URL-based knowledge source into its raw buffer, filename, and MIME type.
 */
export function parseDataUrlKnowledgeSource(source: string):
    | {
          readonly buffer: Buffer;
          readonly filename: string_filename;
          readonly mimeType: string;
      }
    | null {
    if (!isDataUrlKnowledgeSource(source)) {
        return null;
    }

    const commaIndex = source.indexOf(',');
    if (commaIndex === -1) {
        return null;
    }

    const header = source.slice(DATA_URL_PREFIX.length, commaIndex);
    const payload = source.slice(commaIndex + 1);
    const tokens = header.split(';');
    const mediaType = tokens[0] || 'text/plain';

    let filename = `${INLINE_KNOWLEDGE_BASE_NAME}${INLINE_KNOWLEDGE_EXTENSION}` as string_filename;
    let isBase64 = false;

    for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token) {
            continue;
        }

        if (token.toLowerCase() === 'base64') {
            isBase64 = true;
            continue;
        }

        const [key, value] = token.split('=');
        if (key === 'name' && value !== undefined) {
            try {
                filename = decodeURIComponent(value) as string_filename;
            } catch {
                filename = value as string_filename;
            }
        }
    }

    if (!isBase64) {
        return null;
    }

    try {
        const buffer = Buffer.from(payload, 'base64');
        return {
            buffer,
            filename,
            mimeType: mediaType,
        };
    } catch {
        return null;
    }
}

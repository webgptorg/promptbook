/**
 * File filters exposed in the agent PWA manifest so Android only offers share
 * actions for text plus common image/document payloads.
 */
export const AGENT_SHARE_TARGET_FILE_ACCEPT = [
    'image/*',
    '.pdf',
    '.txt',
    '.md',
    '.markdown',
    '.csv',
    '.tsv',
    '.json',
    '.xml',
    '.yaml',
    '.yml',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.odt',
    '.ods',
    '.odp',
    '.rtf',
] as const;

/**
 * Share-target text fields delivered by the Android share sheet.
 */
export type ShareTargetTextFields = {
    title?: string | null;
    text?: string | null;
    url?: string | null;
    attachmentCount?: number;
};

/**
 * Exact MIME types accepted for non-text document shares.
 */
const SUPPORTED_SHARE_TARGET_MIME_TYPES = new Set(['application/pdf']);

/**
 * MIME-type prefixes accepted for image/text shares.
 */
const SUPPORTED_SHARE_TARGET_MIME_PREFIXES = ['image/', 'text/'] as const;

/**
 * File extensions accepted for office/document shares where MIME data is absent.
 */
const SUPPORTED_SHARE_TARGET_FILE_EXTENSIONS = new Set(
    AGENT_SHARE_TARGET_FILE_ACCEPT.filter((accept) => accept.startsWith('.')).map((accept) => accept.toLowerCase()),
);

/**
 * Builds the relative POST action used by the per-agent PWA manifest.
 */
export function createAgentShareTargetActionPath(agentName: string): string {
    return `/agents/${encodeURIComponent(agentName)}/share-target`;
}

/**
 * Returns true when one shared file should be accepted by the PWA share target.
 */
export function isSupportedShareTargetFile(file: { name: string; type?: string | null }): boolean {
    const normalizedMimeType = normalizeShareTargetText(file.type)?.toLowerCase();
    if (normalizedMimeType) {
        if (SUPPORTED_SHARE_TARGET_MIME_TYPES.has(normalizedMimeType)) {
            return true;
        }

        if (SUPPORTED_SHARE_TARGET_MIME_PREFIXES.some((prefix) => normalizedMimeType.startsWith(prefix))) {
            return true;
        }
    }

    const extension = extractShareTargetFileExtension(file.name);
    return extension !== null && SUPPORTED_SHARE_TARGET_FILE_EXTENSIONS.has(extension);
}

/**
 * Resolves the first user-visible message created from a share-sheet payload.
 */
export function resolveShareTargetMessage(fields: ShareTargetTextFields): string | null {
    const normalizedTitle = normalizeShareTargetText(fields.title);
    const normalizedText = normalizeShareTargetText(fields.text);
    const normalizedUrl = normalizeShareTargetText(fields.url);
    const primaryTextParts = deduplicateShareTargetTexts([normalizedText, normalizedUrl]);

    if (primaryTextParts.length > 0) {
        return primaryTextParts.join('\n\n');
    }

    if (normalizedTitle) {
        return normalizedTitle;
    }

    if (fields.attachmentCount === 1) {
        return 'Shared file';
    }

    if ((fields.attachmentCount || 0) > 1) {
        return 'Shared files';
    }

    return null;
}

/**
 * Normalizes one optional share-sheet text value.
 */
function normalizeShareTargetText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    return normalized === '' ? null : normalized;
}

/**
 * Removes duplicate share-sheet text fragments while preserving order.
 */
function deduplicateShareTargetTexts(values: ReadonlyArray<string | null>): Array<string> {
    const uniqueValues: Array<string> = [];

    for (const value of values) {
        if (!value || uniqueValues.includes(value)) {
            continue;
        }

        uniqueValues.push(value);
    }

    return uniqueValues;
}

/**
 * Extracts one lowercase file extension from a shared filename.
 */
function extractShareTargetFileExtension(filename: string): string | null {
    const normalizedFilename = filename.trim().replace(/\\/g, '/').split('/').pop() || '';
    const dotIndex = normalizedFilename.lastIndexOf('.');

    if (dotIndex < 0 || dotIndex === normalizedFilename.length - 1) {
        return null;
    }

    return normalizedFilename.slice(dotIndex).toLowerCase();
}

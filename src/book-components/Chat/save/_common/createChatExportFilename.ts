import { normalizeToKebabCase } from '../../../../utils/normalization/normalize-to-kebab-case';

/**
 * Builds one normalized filename for a chat export download.
 *
 * @param title - Human-readable chat title.
 * @param fileExtension - Output file extension without a leading dot.
 * @param date - Export date used in the filename.
 * @returns Stable filename suitable for browser downloads and HTTP headers.
 *
 * @private Internal helper shared by chat export flows.
 */
export function createChatExportFilename(title: string, fileExtension: string, date = new Date()): string {
    const dateName = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
        .getDate()
        .toString()
        .padStart(2, '0')}`;

    return `${normalizeToKebabCase(title)}-${dateName}.${fileExtension}`;
}

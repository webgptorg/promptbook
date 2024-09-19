import { string_mime_type } from '../../../../../types/typeAliases';
import { ScraperSourceOptions } from '../../AbstractScraper';

/**
 * @@@
 */
export function emulateScraperSourceOptions(mimeType: string_mime_type, content: string): ScraperSourceOptions {
    return {
        source: 'emulated',
        mimeType,
        asBlob: async () => new Blob([content]),
        asJson: async () => JSON.parse(content),
        asText: async () => content,
    };
}

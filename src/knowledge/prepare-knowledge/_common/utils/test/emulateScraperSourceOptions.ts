import { string_mime_type } from '../../../../../types/typeAliases';
import { ScraperSourceOptions } from '../../AbstractScraper';

// TODO: !!!!!! Write this test OR remove it with whole folder

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

/**
 * Note: [⚫] Code in this file should never be published in any package
 */

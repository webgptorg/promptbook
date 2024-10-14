import type { string_name } from '../../types/typeAliases';
import { Registration } from '../../utils/$Register';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { $scrapersMetadataRegister } from '../_common/register/$scrapersMetadataRegister';
import { ScraperConfiguration } from '../_common/register/ScraperConfiguration';

/**
 * Registration of known scraper metadata
 *
 * Warning: This is not useful for the end user, it is just a side effect of the mechanism that handles all available known scrapers
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/cli`
 */
export const _LegacyDocumentScraperMetadataRegistration: Registration = $scrapersMetadataRegister.register({
    title: 'LegacyDocument scraper',
    packageName: '@promptbook/legacy-documents',
    className: 'LegacyDocumentScraper',

    getBoilerplateConfiguration(): ScraperConfiguration[number] {
        return {
            title: 'LegacyDocument scraper (boilerplate)',
            packageName: '@promptbook/legacy-documents',
            className: 'LegacyDocumentScraper',
            options: {
                // TODO: [☂️] Filter not needed options
                pandocPath: 'C:/Users/me/AppData/Local/Pandoc/pandoc.exe',
                libreOfficePath: 'C:/Program Files/LibreOffice/program/swriter.exe',
                // <- TODO: !!!!!! Unhardcode me
            },
        };
    },

    createConfigurationFromEnv(env: Record<string_name, string>): ScraperConfiguration[number] | null {
        TODO_USE(env);
        /*
        TODO: [💀] !!!!!!
        if (typeof env.ANTHROPIC_CLAUDE_API_KEY === 'string') {
            return {
                title: 'LegacyDocument scraper (from env)',
                packageName: '@promptbook/legacydocument',
                className: 'LegacyDocumentScraper',
                options: {
                    // TODO: [☂️] Filter not needed options
                    apiKey: process.env.ANTHROPIC_CLAUDE_API_KEY!,
                },
            };
        }
        */

        return null;
    },
});

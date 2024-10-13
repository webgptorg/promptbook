import type { string_name } from '../../types/typeAliases';
import { Registration } from '../../utils/$Register';
import { TODO_USE } from '../../utils/organization/TODO_USE';
import { $scrapersMetadataRegister } from '../_common/register/$scrapersMetadataRegister';
import { ScraperConfiguration } from '../_common/register/ScraperConfiguration';

/**
 * @@@
 *
 * @public exported from `@promptbook/core`
 * @public exported from `@promptbook/cli`
 */
export const _XxxxScraperMetadataRegistration: Registration = $scrapersMetadataRegister.register({
    title: 'Xxxx scraper',
    packageName: '@promptbook/xxxx',
    className: 'XxxxScraper',

    getBoilerplateConfiguration(): ScraperConfiguration[number] {
        return {
            title: 'Xxxx scraper (boilerplate)',
            packageName: '@promptbook/xxxx',
            className: 'XxxxScraper',
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
                title: 'Xxxx scraper (from env)',
                packageName: '@promptbook/xxxx',
                className: 'XxxxScraper',
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

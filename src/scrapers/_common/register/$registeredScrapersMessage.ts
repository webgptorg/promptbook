import spaceTrim from 'spacetrim';
import type { string_markdown, string_markdown_text } from '../../../types/typeAliases';
import { just } from '../../../utils/organization/just';
import { $scrapersMetadataRegister } from './$scrapersMetadataRegister';
import { $scrapersRegister } from './$scrapersRegister';
import { ScraperAndConverterMetadata } from './ScraperAndConverterMetadata';

/**
 * Creates a message with all registered scrapers
 *
 * Note: This function is used to create a (error) message when there is no scraper for particular mime type
 *
 * @private internal function of `createScrapersFromConfiguration` and `createScrapersFromEnv`
 */
export function $registeredScrapersMessage(): string_markdown {
    /**
     * Mixes registered scrapers from $scrapersMetadataRegister and $scrapersRegister
     */
    const all: Array<
        Pick<
            ScraperAndConverterMetadata,
            'packageName' | 'className' | 'mimeTypes' | 'documentationUrl' | 'isAvilableInBrowser'
        >
    > = [];

    for (const {
        packageName,
        className,
        mimeTypes,
        documentationUrl,
        isAvilableInBrowser,
    } of $scrapersMetadataRegister.list()) {
        if (all.some((item) => item.packageName === packageName && item.className === className)) {
            continue;
        }
        all.push({ packageName, className, mimeTypes, documentationUrl, isAvilableInBrowser });
    }

    for (const {
        packageName,
        className,
        mimeTypes,
        documentationUrl,
        isAvilableInBrowser,
    } of $scrapersRegister.list()) {
        if (all.some((item) => item.packageName === packageName && item.className === className)) {
            continue;
        }
        all.push({ packageName, className, mimeTypes, documentationUrl, isAvilableInBrowser });
    }

    const metadata = all.map((metadata) => {
        const isMetadataAviailable = $scrapersMetadataRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    metadata.packageName === packageName && metadata.className === className,
            );

        const isInstalled = $scrapersRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    metadata.packageName === packageName && metadata.className === className,
            );

        return { ...metadata, isMetadataAviailable, isInstalled };
    });

    if (metadata.length === 0) {
        return `No scrapers are available`;
    }

    return spaceTrim(
        (block) => `
            Available scrapers are:
            ${block(
                metadata
                    .map(
                        (
                            {
                                packageName,
                                className,
                                isMetadataAviailable,
                                isInstalled,
                                mimeTypes,
                                isAvilableInBrowser,
                            },
                            i,
                        ) => {
                            let more: string_markdown_text;

                            // TODO: Use documentationUrl

                            if (just(false)) {
                                more = '';
                            } else if (!isMetadataAviailable && !isInstalled) {
                                // TODO: [�][�] Maybe do allow to do auto-install if package not registered and not found
                                more = `*(not installed and no metadata, looks like a unexpected behavior)*`;
                            } else if (isMetadataAviailable && !isInstalled) {
                                // TODO: [�][�]
                                more = `*(not installed)*`;
                            } else if (!isMetadataAviailable && isInstalled) {
                                more = `*(no metadata, looks like a unexpected behavior)*`;
                            } else if (isMetadataAviailable && isInstalled) {
                                more = `(installed)`;
                            } else {
                                more = `*(unknown state, looks like a unexpected behavior)*`;
                            }

                            if (!isAvilableInBrowser) {
                                more += ` *(not available in browser)*`;
                            }

                            return `${
                                i + 1
                            }) \`${className}\` from \`${packageName}\` compatible to scrape ${mimeTypes.join(
                                ', ', // <- TODO: Some smart join A, B, C and D
                            )} ${more}`;
                        },
                    )
                    .join('\n'),
            )}
        `,
    );
}

/**
 * TODO: [®] DRY Register logic
 */

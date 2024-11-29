import spaceTrim from 'spacetrim';
import type { string_markdown, string_markdown_text } from '../../../types/typeAliases';
import { Scraper } from '../Scraper';
import { $scrapersMetadataRegister } from './$scrapersMetadataRegister';
import { $scrapersRegister } from './$scrapersRegister';
import type { ScraperAndConverterMetadata } from './ScraperAndConverterMetadata';

/**
 * Creates a message with all registered scrapers
 *
 * Note: This function is used to create a (error) message when there is no scraper for particular mime type
 *
 * @private internal function of `createScrapersFromConfiguration` and `createScrapersFromEnv`
 */
export function $registeredScrapersMessage(availableScrapers: ReadonlyArray<Scraper>): string_markdown {
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

    for (const { metadata } of availableScrapers) {
        all.push(metadata);
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

        const isAvilableInTools = availableScrapers.some(
            ({ metadata: { packageName, className } }) =>
                metadata.packageName === packageName && metadata.className === className,
        );

        return { ...metadata, isMetadataAviailable, isInstalled, isAvilableInTools };
    });

    if (metadata.length === 0) {
        return spaceTrim(`
            **No scrapers are available**

            This is a unexpected behavior, you are probably using some broken version of Promptbook
            At least there should be available the metadata of the scrapers
        `);
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
                                isAvilableInTools,
                            },
                            i,
                        ) => {
                            const more: Array<string_markdown_text> = [];

                            // TODO: [🧠] Maybe use `documentationUrl`

                            if (isMetadataAviailable) {
                                more.push(`⬜ Metadata registered`);
                            } // not else

                            if (isInstalled) {
                                more.push(`🟩 Installed`);
                            } // not else
                            if (isAvilableInTools) {
                                more.push(`🟦 Available in tools`);
                            } // not else

                            if (!isMetadataAviailable && isInstalled) {
                                more.push(
                                    `When no metadata registered but scraper is installed, it is an unexpected behavior`,
                                );
                            } // not else

                            if (!isInstalled && isAvilableInTools) {
                                more.push(
                                    `When the scraper is not installed but available in tools, it is an unexpected compatibility behavior`,
                                );
                            } // not else

                            if (!isAvilableInBrowser) {
                                more.push(`Not usable in browser`);
                            }

                            const moreText = more.length === 0 ? '' : ` *(${more.join('; ')})*`;

                            return `${i + 1}) \`${className}\` from \`${packageName}\` compatible to scrape ${mimeTypes
                                .map((mimeType) => `"${mimeType}"`)
                                .join(
                                    ', ', // <- TODO: Some smart join A, B, C and D
                                )}${moreText}`;
                        },
                    )
                    .join('\n'),
            )}

            Legend:
            - ⬜ **Metadata registered** means that Promptbook knows about the scraper, it is similar to registration in some registry
            - 🟩 **Installed** means that you have imported package with particular scraper
            - 🟦 **Available in tools** means that you have passed scraper as dependency into prepare or execution process

        `,
    );
}

/**
 * TODO: [®] DRY Register logic
 */

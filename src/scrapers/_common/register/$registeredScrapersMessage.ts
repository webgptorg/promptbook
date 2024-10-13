import spaceTrim from 'spacetrim';
import type { string_markdown } from '../../../types/typeAliases';
import type { Registered } from '../../../utils/$Register';
import { just } from '../../../utils/organization/just';
import { $scrapersMetadataRegister } from './$scrapersMetadataRegister';
import { $scrapersRegister } from './$scrapersRegister';

/**
 * Creates a message with all registered LLM tools
 *
 * Note: This function is used to create a (error) message when there is no constructor for some LLM provider
 *
 * @private internal function of `createScrapersFromConfiguration` and `createScrapersFromEnv`
 */
export function $registeredScrapersMessage(): string_markdown {
    /**
     * Mixes registered LLM tools from $scrapersMetadataRegister and $scrapersRegister
     */
    const all: Array<Registered> = [];

    for (const { packageName, className } of $scrapersMetadataRegister.list()) {
        if (all.some((item) => item.packageName === packageName && item.className === className)) {
            continue;
        }
        all.push({ packageName, className });
    }

    for (const { packageName, className } of $scrapersRegister.list()) {
        if (all.some((item) => item.packageName === packageName && item.className === className)) {
            continue;
        }
        all.push({ packageName, className });
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
        return `No LLM providers are available.`;
    }

    return spaceTrim(
        (block) => `
            Available LLM providers are:
            ${block(
                metadata
                    .map(({ packageName, className, isMetadataAviailable, isInstalled }, i) => {
                        let more: string;

                        if (just(false)) {
                            more = '';
                        } else if (!isMetadataAviailable && !isInstalled) {
                            // TODO: [�][�] Maybe do allow to do auto-install if package not registered and not found
                            more = `(not installed and no metadata, looks like a unexpected behavior)`;
                        } else if (isMetadataAviailable && !isInstalled) {
                            // TODO: [�][�]
                            more = `(not installed)`;
                        } else if (!isMetadataAviailable && isInstalled) {
                            more = `(no metadata, looks like a unexpected behavior)`;
                        } else if (isMetadataAviailable && isInstalled) {
                            more = `(installed)`;
                        } else {
                            more = `(unknown state, looks like a unexpected behavior)`;
                        }

                        return `${i + 1}) \`${className}\` from \`${packageName}\` ${more}`;
                    })
                    .join('\n'),
            )}
        `,
    );
}

/**
 * TODO: [®] DRY Register logic
 */

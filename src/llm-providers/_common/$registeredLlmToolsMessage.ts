import spaceTrim from 'spacetrim';
import { string_markdown } from '../../types/typeAliases';
import { Registered } from '../../utils/$Register';
import { just } from '../../utils/organization/just';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
import { $llmToolsRegister } from './$llmToolsRegister';

/**
 * Creates a message with all registered LLM tools
 *
 * Note: This function is used to create a (error) message when there is no constructor for some LLM provider
 *
 * @private internal function of `createLlmToolsFromConfiguration` and `createLlmToolsFromEnv`
 */
export function $registeredLlmToolsMessage(): string_markdown {
    /**
     * Mixes registered LLM tools from $llmToolsMetadataRegister and $llmToolsRegister
     */
    const all: Array<Registered> = [];

    for (const { packageName, className } of $llmToolsMetadataRegister.list()) {
        if (all.some((item) => item.packageName === packageName && item.className === className)) {
            continue;
        }
        all.push({ packageName, className });
    }

    for (const { packageName, className } of $llmToolsRegister.list()) {
        if (all.some((item) => item.packageName === packageName && item.className === className)) {
            continue;
        }
        all.push({ packageName, className });
    }

    const metadata = all.map((metadata) => {
        const isMetadataAviailable = $llmToolsMetadataRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    metadata.packageName === packageName && metadata.className === className,
            );

        const isInstalled = $llmToolsRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    metadata.packageName === packageName && metadata.className === className,
            );

        return { ...metadata, isMetadataAviailable, isInstalled };
    });

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
                            more = `(not installed and no metadata, looks like a unexpected behavior)`;
                        } else if (isMetadataAviailable && !isInstalled) {
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

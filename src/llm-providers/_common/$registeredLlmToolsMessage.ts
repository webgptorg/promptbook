import spaceTrim from 'spacetrim';
import { string_markdown } from '../../types/typeAliases';
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
    const metadata = $llmToolsMetadataRegister.list().map((metadata) => {
        const isInstalled = $llmToolsRegister
            .list()
            .find(
                ({ packageName, className }) =>
                    metadata.packageName === packageName && metadata.className === className,
            );

        return { ...metadata, isInstalled };
    });

    return spaceTrim(
        (block) => `
            Available LLM providers are:
            ${block(
                metadata
                    .map(
                        ({ packageName, className, isInstalled }) =>
                            `- \`${className}\` from \`${packageName}\`${!isInstalled ? '' : ' (installed)'}`,
                    )
                    .join('\n'),
            )}
        `,
    );
}

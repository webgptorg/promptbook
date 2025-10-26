import colors from 'colors';
import spaceTrim from 'spacetrim';
import type { string_filename, string_markdown, string_name } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import type { Registered } from '../../../utils/misc/$Register';
import { $side_effect } from '../../../utils/organization/$side_effect';
import { just } from '../../../utils/organization/just';
import { $llmToolsMetadataRegister } from './$llmToolsMetadataRegister';
import { $llmToolsRegister } from './$llmToolsRegister';
import type { LlmToolsMetadata } from './LlmToolsMetadata';

/**
 * Path to the `.env` file which was used to configure LLM tools
 *
 * Note: `$` is used to indicate that this variable is changed by side effect in `$provideLlmToolsConfigurationFromEnv` through `$setUsedEnvFilename`
 */
let $usedEnvFilename: string | null = null;

/**
 * Pass the `.env` file which was used to configure LLM tools
 *
 * Note: `$` is used to indicate that this variable is making side effect
 *
 * @private internal log of `$provideLlmToolsConfigurationFromEnv` and `$registeredLlmToolsMessage`
 */
export function $setUsedEnvFilename(filepath: string_filename): $side_effect {
    $usedEnvFilename = filepath;
}

/**
 * Creates a message with all registered LLM tools
 *
 * Note: This function is used to create a (error) message when there is no constructor for some LLM provider
 *
 * @private internal function of `createLlmToolsFromConfiguration` and `$provideLlmToolsFromEnv`
 */
export function $registeredLlmToolsMessage(): string_markdown {
    let env: Record<string_name, string>;
    if ($isRunningInNode()) {
        env = process.env as Record<string_name, string>;
        // <- TODO: [⚛] Some DRY way how to get to `process.env` and pass it into functions - ACRY search for `env`
    } else {
        env = {};
    }

    /**
     * Mixes registered LLM tools from $llmToolsMetadataRegister and $llmToolsRegister
     */
    const all: Array<Registered & Partial<Pick<LlmToolsMetadata, 'title' | 'envVariables'>>> = [];

    for (const { title, packageName, className, envVariables } of $llmToolsMetadataRegister.list()) {
        if (all.some((item) => item.packageName === packageName && item.className === className)) {
            continue;
        }
        all.push({ title, packageName, className, envVariables });
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

        const isFullyConfigured =
            metadata.envVariables?.every((envVariableName) => env[envVariableName] !== undefined) || false;
        const isPartiallyConfigured =
            metadata.envVariables?.some((envVariableName) => env[envVariableName] !== undefined) || false;
        // <- Note: [🗨]

        return { ...metadata, isMetadataAviailable, isInstalled, isFullyConfigured, isPartiallyConfigured };
    });

    const usedEnvMessage =
        $usedEnvFilename === null ? `Unknown \`.env\` file` : `Used \`.env\` file:\n${$usedEnvFilename}`;

    if (metadata.length === 0) {
        return spaceTrim(
            (block) => `
                No LLM providers are available.

                ${block(usedEnvMessage)}
          `,
        );
    }

    return spaceTrim(
        (block) => `

            ${block(usedEnvMessage)}

            Relevant environment variables:
            ${block(
                Object.keys(env)
                    .filter((envVariableName) =>
                        metadata.some(({ envVariables }) => envVariables?.includes(envVariableName)),
                    )
                    .map((envVariableName) => `- \`${envVariableName}\``)
                    .join('\n'),
            )}

            Available LLM providers are:
            ${block(
                metadata
                    .map(
                        (
                            {
                                title,
                                packageName,
                                className,
                                envVariables,
                                isMetadataAviailable,
                                isInstalled,
                                isFullyConfigured,
                                isPartiallyConfigured,
                            },
                            i,
                        ) => {
                            const morePieces: Array<string> = [];

                            if (just(false)) {
                                // Keep for prettier formatting
                            } else if (!isMetadataAviailable && !isInstalled) {
                                // TODO: [�][�] Maybe do allow to do auto-install if package not registered and not found
                                morePieces.push(`Not installed and no metadata, looks like a unexpected behavior`);
                            } else if (isMetadataAviailable && !isInstalled) {
                                // TODO: [�][�]
                                morePieces.push(`Not installed`);
                            } else if (!isMetadataAviailable && isInstalled) {
                                morePieces.push(`No metadata but installed, looks like a unexpected behavior`);
                            } else if (isMetadataAviailable && isInstalled) {
                                morePieces.push(`Installed`);
                            } else {
                                morePieces.push(`unknown state, looks like a unexpected behavior`);
                            } /* not else */

                            if (isFullyConfigured) {
                                morePieces.push(`Configured`);
                            } else if (isPartiallyConfigured) {
                                morePieces.push(
                                    `Partially confugured, missing ${envVariables
                                        ?.filter((envVariable) => env[envVariable] === undefined)
                                        .join(' + ')}`,
                                );
                            } else {
                                if (envVariables !== null) {
                                    morePieces.push(
                                        `Not configured, to configure set env ${envVariables?.join(' + ')}`,
                                    );
                                } else {
                                    morePieces.push(`Not configured`); // <- Note: Can not be configured via environment variables
                                }
                            }

                            let providerMessage = spaceTrim(`
                                ${i + 1}) **${title}** \`${className}\` from \`${packageName}\`
                                    ${morePieces.join('; ')}
                            `);

                            if ($isRunningInNode) {
                                if (isInstalled && isFullyConfigured) {
                                    providerMessage = colors.green(providerMessage);
                                } else if (isInstalled && isPartiallyConfigured) {
                                    providerMessage = colors.yellow(providerMessage);
                                } else {
                                    providerMessage = colors.gray(providerMessage);
                                }
                            }

                            return providerMessage;
                        },
                    )
                    .join('\n'),
            )}
        `,
    );
}

/**
 * TODO: [®] DRY Register logic
 * TODO: [🧠][⚛] Maybe pass env as argument
 */

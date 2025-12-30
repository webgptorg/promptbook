import spaceTrim from 'spacetrim';
import { PUBLIC_AGENTS_SERVERS } from '../../../servers';
import { CLAIM, IS_COST_PREVENTED, NAME } from '../../config';
import type { string_markdown } from '../../types/typeAliases';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
import { $detectRuntimeEnvironment } from '../environment/$detectRuntimeEnvironment';
import { valueToString } from '../parameters/valueToString';
// [😺]> import logoAsset from './logo-blue-white-256.png';

export type AboutPromptbookInformationOptions = {
    /**
     * Include information about available servers
     *
     * @default true
     */
    isServersInfoIncluded?: boolean;

    /**
     * Include information about runtime environment
     *
     * @default true
     */
    isRuntimeEnvironmentInfoIncluded?: boolean;
};

/**
 * Provide information about Promptbook, engine version, book language version, servers, ...
 *
 * @param options Which information to include
 * @returns  Information about Promptbook in markdown format
 *
 * @public exported from `@promptbook/core`
 */
export function aboutPromptbookInformation(options?: AboutPromptbookInformationOptions): string_markdown {
    const { isServersInfoIncluded = true, isRuntimeEnvironmentInfoIncluded = true } = options || {};

    const fullInfoPieces: string_markdown[] = [];

    const basicInfo = spaceTrim(
        `

            # ${NAME}

            ${CLAIM}

            - [Promptbook engine version \`${PROMPTBOOK_ENGINE_VERSION}\`](https://github.com/webgptorg/promptbook)
            - [Book language version \`${BOOK_LANGUAGE_VERSION}\`](https://github.com/webgptorg/book)

        `,
    );

    fullInfoPieces.push(basicInfo);

    if (isServersInfoIncluded) {
        const serversInfo = spaceTrim(
            (block) => `

                ## Servers

                ${block(
                    PUBLIC_AGENTS_SERVERS.map(
                        ({ title, url, description }, index) => `${index + 1}. ${title} ${description} ${url}`,
                    ).join('\n'),
                )}
            `,
        );
        fullInfoPieces.push(serversInfo);
    }

    if (isRuntimeEnvironmentInfoIncluded) {
        const runtimeEnvironment = $detectRuntimeEnvironment();

        const environmentInfoRecord = {
            ...runtimeEnvironment,
            isCostPrevented: IS_COST_PREVENTED,
        };

        const environmentInfo = spaceTrim(
            (block) => `

                ## Environment

                ${block(
                    Object.entries(environmentInfoRecord)
                        .map(([key, value]) => `- **${key}:** ${valueToString(value)}`)
                        .join('\n'),
                )}
            `,
        );
        fullInfoPieces.push(environmentInfo);
    }

    const fullInfo = spaceTrim(fullInfoPieces.join('\n\n'));

    return fullInfo;
}

/**
 * TODO: [🗽] Unite branding and make single place for it
 */

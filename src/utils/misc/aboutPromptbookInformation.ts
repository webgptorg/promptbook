import spaceTrim from 'spacetrim';
import { REMOTE_SERVER_URLS } from '../../../servers';
import { CLAIM, NAME } from '../../config';
import type { string_markdown } from '../../types/typeAliases';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../version';
// [😺]> import logoAsset from './logo-blue-white-256.png';

export type AboutPromptbookInformationOptions = {
    /**
     * Include information about available servers
     *
     * @default true
     */
    isServersInfoIncluded?: boolean;
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
    const { isServersInfoIncluded = true } = options || {};

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
                    REMOTE_SERVER_URLS.map(
                        ({ title, urls, isAnonymousModeAllowed, description }, index) =>
                            `${index + 1}. ${title} ${description}
                        ${isAnonymousModeAllowed ? '🐱‍💻 ' : ''} ${urls.join(', ')}
                    `,
                    ).join('\n'),
                )}
            `,
        );
        fullInfoPieces.push(serversInfo);
    }

    const fullInfo = spaceTrim(fullInfoPieces.join('\n\n'));

    return fullInfo;
}

/**
 * TODO: [🗽] Unite branding and make single place for it
 */

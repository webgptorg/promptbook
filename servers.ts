import type { string_legal_entity, string_promptbook_server_url, string_title } from './src/types/typeAliases';

/**
 * Open Promptbook server usable for public
 */
type ServerConfiguration = {
    /**
     * Basic name of the server
     */
    title: string_title;

    /**
     * Who is the owner of the server
     */
    owner: string_legal_entity;

    /**
     * Description of the server, link to registration, user agreement, privacy policy, etc.
     */
    description: string;

    /**
     * URL of the server
     *
     Note: lising more for loadbalancing
     */
    urls: Array<string_promptbook_server_url>;
};

/**
 * Available remote servers for the Promptbook
 *
 * @public exported from `@promptbook/core`
 */
export const REMOTE_SERVER_URLS: Array<ServerConfiguration> = [
    {
        title: 'Promptbook.Studio',
        description: `Server of Promptbook.studio`,
        owner: 'AI Web, LLC <legal@ptbk.io> (https://www.ptbk.io/)',
        urls: [
            'https://promptbook.s5.ptbk.io/',
            // Note: Servers 1-4 are not running
        ],
    },
    {
        title: 'Testing Agents',
        description: `Testing Agents server on Vercel`,
        owner: 'AI Web, LLC <legal@ptbk.io> (https://www.ptbk.io/)',
        urls: ['https://s6.ptbk.io/'],
    },
    /*
    Note: Working on older version of Promptbook and not supported anymore
    {
        title: 'Pavol Promptbook Server',
        description: `Personal server of Pavol Hejný with simple testing server, DO NOT USE IT FOR PRODUCTION`,
        owner: 'Pavol Hejný <pavol@ptbk.io> (https://www.pavolhejny.com/)',
        isAnonymousModeAllowed: true,
        urls: ['https://api.pavolhejny.com/promptbook'],
    },
    */
];

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

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
     * Is the server open for public and anonymous usage
     */
    isAnonymousModeAllowed: boolean;

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
 * @public exported from `@promptbook/core` <- TODO: !!!! Test that this is really exported
 */
export const REMOTE_SERVER_URLS: Array<ServerConfiguration> = [
    {
        title: 'Promptbook',
        description: `Servers of Promptbook.studio`,
        owner: 'AI Web, LLC <legal@ptbk.io> (https://www.ptbk.io/)',
        isAnonymousModeAllowed: true,
        urls: [
            'https://s4.ptbk.io/promptbook',
            'https://s3.ptbk.io/promptbook',
            'https://s2.ptbk.io/promptbook',
            'https://s1.ptbk.io/promptbook',
        ],
    },

    {
        title: 'Pavol Promptbook Server',
        description: `Personal server of Pavol Hejný with simple testing server, DO NOT USE IT FOR PRODUCTION`,
        owner: 'Pavol Hejný <pavol@ptbk.io> (https://www.pavolhejny.com/)',
        isAnonymousModeAllowed: true,
        urls: ['https://api.pavolhejny.com/promptbook'],
    },
];

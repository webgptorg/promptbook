import { PROMPTBOOK_LEGAL_ENTITY } from './src/config';
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
    url: string_promptbook_server_url;
    // <- TODO: !!!! Change to URL
};

/**
 * Core Promptbook server configuration
 *
 * Used for "Adam" agent which is built in as default ancestor for new agents and other well known agents
 *
 * @public exported from `@promptbook/core`
 */
export const CORE_AGENTS_SERVER: ServerConfiguration = {
    title: 'Promptbook Core',
    description: `Core Promptbook server used for Adam agent which is built in as default ancestor for new agents and other well known agents.`,
    owner: PROMPTBOOK_LEGAL_ENTITY,
    url: 'https://core.ptbk.io/',
};

/**
 * Available agents servers for the Promptbook
 *
 * Tip: 💡 If you are running your own server, you can add it to this list by creating a pull request!
 *
 * @public exported from `@promptbook/core`
 */
export const PUBLIC_AGENTS_SERVERS: Array<ServerConfiguration> = [
    CORE_AGENTS_SERVER,
    {
        title: 'Promptbook Gallery',
        description: `Gallery of ideas, AI professions,... like AI Agenta photobank.`,
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://gallery.ptbk.io/',
    },
    {
        title: 'Promptbook Testing server 6',
        description: `General-purpose testing server.`,
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://s6.ptbk.io/',
    },
    {
        title: 'Promptbook Testing server 7',
        description: `General-purpose testing server.`,
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://s7.ptbk.io/',
    },
    {
        title: 'Promptbook Testing server 8',
        description: `General-purpose testing server.`,
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://s8.ptbk.io/',
    },
];

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

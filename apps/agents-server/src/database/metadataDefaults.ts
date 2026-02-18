import spaceTrim from 'spacetrim';
import { CORE_AGENTS_SERVER } from '../../../../servers';
import { DEFAULT_THINKING_MESSAGES } from '../../../../src/utils/DEFAULT_THINKING_MESSAGES';

export type MetadataType = 'TEXT_SINGLE_LINE' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'IMAGE_URL' | 'IP_RANGE';

export const metadataDefaults = [
    {
        key: 'SERVER_NAME',
        value: 'Promptbook Agents Server',
        note: 'The name of the server displayed in the heading bar',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'SERVER_DESCRIPTION',
        value: 'Agents server powered by Promptbook',
        note: 'The description of the server displayed in the search engine results',
        type: 'TEXT',
    },
    {
        key: 'AGENT_NAMING',
        value: 'Agent / Agents',
        note: 'Override the singular/plural naming for agents in the UI. Format: singular/plural (e.g. chatbot/chatbots).',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'THINKING_MESSAGES',
        value: DEFAULT_THINKING_MESSAGES.join(' / '),
        note: 'Slash-delimited variants used for the thinking placeholder message (e.g. Thinking...).',
        type: 'TEXT',
    },
    {
        key: 'SERVER_LOGO_URL',
        value: '',
        note: 'The URL of the logo displayed in the heading bar',
        type: 'IMAGE_URL',
    },
    {
        key: 'SERVER_FAVICON_URL',
        value: '',
        note: 'The URL of the favicon',
        type: 'IMAGE_URL',
    },
    {
        key: 'HOMEPAGE_MESSAGE',
        value: '',
        note: 'Markdown message displayed above the agents list on the homepage.',
        type: 'TEXT',
    },
    {
        key: 'CHAT_FAIL_MESSAGE',
        value: 'Sorry, I encountered an error processing your message. Please, try again later.',
        note: 'Friendly text shown inside chats when a reply fails to generate.',
        type: 'TEXT',
    },
    {
        key: 'RESTRICT_IP',
        value: '',
        note: 'Comma separated list of allowed IPs or CIDR ranges. If set, only clients from these IPs are allowed to access the server.',
        type: 'IP_RANGE',
    },
    {
        key: 'CORE_SERVER',
        value: CORE_AGENTS_SERVER.url,
        note: spaceTrim(`
                Core Promptbook server URL used for agents that are used for common tasks, these agents are called well known agents:

                On the core server, the following well known agents should be hosted: 
                - \`adam\`: The default ancestor agent for new agents
                - \`teacher\`: Agent that knows book syntax and can help with self-learning
            
            `),
        type: 'TEXT',
    },
    // <- TODO: [🆎] Allow to set well-known agent names via Metadata

    {
        key: 'FEDERATED_SERVERS',
        value: '',
        note: 'Comma separated list of federated servers URLs. The server will look to all federated servers and list their agents.',
        type: 'TEXT',
    },
    {
        key: 'SHOW_FEDERATED_SERVERS_PUBLICLY',
        value: 'false',
        note: 'Whether to show federated servers and their agents to anonymous users. When false, federated servers are only visible to authenticated users.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_EXPERIMENTAL_VOICE_CALLING_ENABLED',
        value: 'false',
        note: 'Enable or disable voice calling features for agents. When disabled, voice API endpoints will return 403 Forbidden.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED',
        value: 'true',
        note: 'Enable or disable text-to-speech and speak-to-text functionality. When disabled, the TTS/STT endpoints and UI controls are hidden.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_FILE_ATTACHEMENTS_ENABLED',
        value: 'true',
        note: 'Enable or disable file attachments in the chat UI.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_FEEDBACK_ENABLED',
        value: 'true',
        note: 'Enable or disable collecting chat feedback and showing the feedback menu entry.',
        type: 'BOOLEAN',
    },
    {
        key: 'DEFAULT_IS_SOUNDS_ON',
        value: 'false',
        note: 'Default state for chat sounds when a user has no saved preference. When false, sounds start muted.',
        type: 'BOOLEAN',
    },
    {
        key: 'DEFAULT_IS_VIBRATION_ON',
        value: 'true',
        note: 'Default state for chat vibration feedback when no preference is saved. When true, haptics stay enabled even if sounds are muted.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_FOOTER_SHOWN',
        value: 'true',
        note: 'Show or hide the footer.',
        type: 'BOOLEAN',
    },
    {
        key: 'FOOTER_LINKS',
        value: '[]',
        note: 'Extra links to display in the footer, as a JSON array of objects with title and url properties.',
        type: 'TEXT',
    },
    {
        key: 'MAX_FILE_UPLOAD_SIZE_MB',
        value: '50', // <- TODO: [🌲] To /config.ts
        note: 'Maximum size of file that can be uploaded in MB.',
        type: 'NUMBER',
    },
    {
        key: 'NAME_POOL',
        value: 'ENGLISH',
        note: 'Language for generating new agent names. Possible values: ENGLISH, CZECH.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'ADMIN_EMAIL',
        value: 'support@ptbk.io',
        note: 'Administrator email address used for password reset and user registration requests.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'DEFAULT_AGENT_VISIBILITY',
        value: 'PRIVATE',
        note: 'Default visibility for new agents. Can be PUBLIC or PRIVATE.',
        type: 'TEXT_SINGLE_LINE',
    },
] as const satisfies ReadonlyArray<{
    key: string;
    value: string;
    note: string;
    type: MetadataType;
}>;

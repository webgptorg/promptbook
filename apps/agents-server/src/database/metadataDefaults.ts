import { spaceTrim } from 'spacetrim';
import { CORE_AGENTS_SERVER } from '../../../../servers';
import { DEFAULT_THINKING_MESSAGES } from '../../../../src/utils/DEFAULT_THINKING_MESSAGES';
import { ANALYTICS_METADATA_KEYS, getAnalyticsMetadataDefinition } from '../constants/analyticsMetadata';
import {
    DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS,
    FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY,
} from '../constants/federatedAgentImport';
import { MetadataType } from '../constants/metadataTypes';
import { NEW_AGENT_WIZZARD_METADATA_KEY } from '../constants/newAgentWizard';
import {
    DEFAULT_SERVER_LIMIT_VALUES,
    MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY,
    SERVER_LIMIT_KEYS,
} from '../constants/serverLimits';
import { DEFAULT_TOOL_USAGE_LIMITS, TOOL_USAGE_LIMITS_METADATA_KEY } from '../constants/toolUsageLimits';
import {
    CHAT_VISUAL_MODE_METADATA_KEY,
    DEFAULT_CHAT_VISUAL_MODE,
    CHAT_VISUAL_MODES,
} from '../constants/chatVisualMode';
import {
    IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
    SERVER_LANGUAGE_METADATA_KEY,
} from '../languages/ServerLanguageRegistry';

/**
 * Default metadata entries produced from the analytics configuration definitions.
 *
 * @private
 */
const analyticsMetadataDefaults = ANALYTICS_METADATA_KEYS.map((key) => {
    const definition = getAnalyticsMetadataDefinition(key);
    return {
        key,
        value: definition.defaultValue,
        note: definition.note,
        type: definition.type,
    };
});

/**
 * Constant for metadata defaults.
 */
export const metadataDefaults = [
    {
        key: 'SERVER_NAME',
        value: 'Promptbook Agents Server',
        note: 'The name of the server displayed in the heading bar',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: SERVER_LANGUAGE_METADATA_KEY,
        value: 'en',
        note: 'Default language of the server UI. Available values: en, cs.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: IS_SERVER_LANGUAGE_ENFORCED_METADATA_KEY,
        value: 'false',
        note: 'When true, users cannot override SERVER_LANGUAGE in their browser and the server UI language is enforced globally.',
        type: 'BOOLEAN',
    },
    {
        key: 'SERVER_DESCRIPTION',
        value: 'Agents server powered by Promptbook',
        note: 'The description of the server displayed in the search engine results',
        type: 'TEXT',
    },
    {
        key: 'SERVER_VISIBILITY',
        value: 'PRIVATE',
        note: 'Global crawling/indexing mode for this server. PRIVATE blocks sitemap and indexing; PUBLIC enables indexing for PUBLIC agents.',
        type: 'TEXT_SINGLE_LINE',
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
        key: TOOL_USAGE_LIMITS_METADATA_KEY,
        value: JSON.stringify(DEFAULT_TOOL_USAGE_LIMITS),
        note: 'Deprecated. Manage timeout tool limits in `/admin/limits`; this metadata row is mirrored for backward compatibility.',
        type: 'TEXT',
    },
    {
        key: 'USER_CHAT_BACKGROUND_CRON_INTERVAL_MINUTES',
        value: '2',
        note: 'Expected cron cadence for background durable chat workers (`/api/internal/user-chat-jobs/run` and `/api/internal/user-chat-timeouts/run`).',
        type: 'NUMBER',
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
    {
        key: 'IS_CORE_SERVER_HIDDEN',
        value: 'false',
        note: 'Hide the core federated server from homepage, navbar, search, and footer links while keeping it available for references when true.',
        type: 'BOOLEAN',
    },
    // <- TODO: [🆎] Allow to set well-known agent names via Metadata

    {
        key: 'FEDERATED_SERVERS',
        value: '',
        note: 'Comma separated list of federated servers URLs. The server will look to all federated servers and list their agents.',
        type: 'TEXT',
    },
    {
        key: FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS_METADATA_KEY,
        value: String(DEFAULT_FEDERATED_AGENT_IMPORT_RETRY_DELAY_MS),
        note: 'Deprecated. Manage federated import retry delay in `/admin/limits`; this metadata row is mirrored for backward compatibility.',
        type: 'NUMBER',
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
        key: 'CHAT_FEEDBACK_MODE',
        value: 'stars',
        note: 'Controls post-response feedback UI mode. Allowed values: off, stars, report_issue.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'IS_FEEDBACK_ENABLED',
        value: 'true',
        note: 'Legacy feedback toggle kept for backward compatibility. Prefer CHAT_FEEDBACK_MODE for new setups.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_EMBEDDING_ALLOWED',
        value: 'true',
        note: 'Allow serving the headless chat route (`/agents/:agentName/chat?headless`) so other sites can embed it.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_EXPERIMENTAL_PWA_APP_ENABLED',
        value: 'true',
        note: 'Show or hide the experimental install-app option inside agent menus.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_CONTROL_PANEL_SOUND_ENABLED',
        value: 'true',
        note: 'Show or hide the Sound option in the user control panel for this server.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_CONTROL_PANEL_VIBRATION_ENABLED',
        value: 'true',
        note: 'Show or hide the Vibration option in the user control panel for this server.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_CONTROL_PANEL_NOTIFICATIONS_ENABLED',
        value: 'true',
        note: 'Show or hide the browser Notifications option in the user control panel for this server.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_CONTROL_PANEL_SELF_LEARNING_ENABLED',
        value: 'true',
        note: 'Show or hide the Self-learning option in the user control panel for this server.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_CONTROL_PANEL_PRIVATE_MODE_ENABLED',
        value: 'true',
        note: 'Show or hide the Private mode option in the user control panel for this server.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_CONTROL_PANEL_LANGUAGE_ENABLED',
        value: 'true',
        note: 'Show or hide the Language section in the user control panel for this server. The section is also hidden automatically when SERVER_LANGUAGE is enforced.',
        type: 'BOOLEAN',
    },
    {
        key: 'IS_CONTROL_PANEL_CHAT_VISUAL_MODE_ENABLED',
        value: 'true',
        note: 'Show or hide the Chat visual mode section in the user control panel for this server.',
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
        key: 'DEFAULT_IS_NOTIFICATIONS_ON',
        value: 'false',
        note: 'Default state for browser push notifications when a user has no saved preference. When false, users must opt in before agent replies can trigger notifications.',
        type: 'BOOLEAN',
    },
    {
        key: CHAT_VISUAL_MODE_METADATA_KEY,
        value: DEFAULT_CHAT_VISUAL_MODE,
        note: `Default chat visual mode for new browser sessions. Allowed values: ${CHAT_VISUAL_MODES.BUBBLE_MODE}, ${CHAT_VISUAL_MODES.ARTICLE_MODE}.`,
        type: 'TEXT_SINGLE_LINE',
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
        key: MAX_FILE_UPLOAD_SIZE_MB_METADATA_KEY,
        value: String(DEFAULT_SERVER_LIMIT_VALUES[SERVER_LIMIT_KEYS.MAX_FILE_UPLOAD_SIZE_MB]),
        note: 'Deprecated. Manage file upload size in `/admin/limits`; this metadata row is mirrored for backward compatibility.',
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
        key: 'DEFAULT_VISIBILITY',
        value: 'UNLISTED',
        note: 'Default visibility for new agents. Can be PRIVATE, UNLISTED, or PUBLIC.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: NEW_AGENT_WIZZARD_METADATA_KEY,
        value: 'BOILERPLATE',
        note: 'Controls the "new agent" flow. Possible values: BOILERPLATE or WIZARD.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'MANAGEMENT_API_CORS_ORIGINS',
        value: '*',
        note: 'Allowed origins for browser-based management API clients and OpenAPI fetches. Use `*` or a comma separated list of exact origins.',
        type: 'TEXT',
    },
    {
        key: 'GITHUB_APP_ID',
        value: '',
        note: 'Numeric GitHub App ID (found in the app settings).',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'GITHUB_APP_SLUG',
        value: '',
        note: 'GitHub App slug as seen in the app URL (e.g. https://github.com/apps/<slug>).',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'GITHUB_APP_PRIVATE_KEY',
        value: '',
        note: 'GitHub App private key in PEM format. Replace actual line breaks with \\n when editing via Metadata UI.',
        type: 'TEXT',
    },
    {
        key: 'GITHUB_APP_STATE_SECRET',
        value: '',
        note: 'Secret used for signing GitHub App connect state. Keep it unique per deployment.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'GOOGLE_CALENDAR_CLIENT_ID',
        value: '',
        note: 'Google OAuth client ID used for Google Calendar connect flow.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'GOOGLE_CALENDAR_CLIENT_SECRET',
        value: '',
        note: 'Google OAuth client secret used for Google Calendar connect flow.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'GOOGLE_CALENDAR_REDIRECT_URI',
        value: '',
        note: 'Redirect URI registered in Google Cloud Console for Calendar OAuth callbacks.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'GOOGLE_CALENDAR_STATE_SECRET',
        value: '',
        note: 'Secret used for signing Google Calendar OAuth state payloads.',
        type: 'TEXT_SINGLE_LINE',
    },
    ...analyticsMetadataDefaults,
] as const satisfies ReadonlyArray<{
    key: string;
    value: string;
    note: string;
    type: MetadataType;
}>;

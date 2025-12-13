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
        key: 'RESTRICT_IP',
        value: '',
        note: 'Comma separated list of allowed IPs or CIDR ranges. If set, only clients from these IPs are allowed to access the server.',
        type: 'IP_RANGE',
    },
    {
        key: 'FEDERATED_SERVERS',
        value: '',
        note: 'Comma separated list of federated servers URLs. The server will look to all federated servers and list their agents.',
        type: 'TEXT',
    },
    {
        key: 'IS_EXPERIMENTAL_VOICE_CALLING_ENABLED',
        value: 'false',
        note: 'Enable or disable voice calling features for agents. When disabled, voice API endpoints will return 403 Forbidden.',
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
] as const satisfies ReadonlyArray<{
    key: string;
    value: string;
    note: string;
    type: MetadataType;
}>;

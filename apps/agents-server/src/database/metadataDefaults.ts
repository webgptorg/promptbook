export type MetadataType = 'TEXT_SINGLE_LINE' | 'TEXT' | 'NUMBER' | 'BOOLEAN';

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
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'SERVER_FAVICON_URL',
        value: '',
        note: 'The URL of the favicon',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'RESTRICT_IP',
        value: '',
        note: 'Comma separated list of allowed IPs or CIDR ranges. If set, only clients from these IPs are allowed to access the server.',
        type: 'TEXT_SINGLE_LINE',
    },
    {
        key: 'FEDERATED_SERVERS',
        value: '',
        note: 'Comma separated list of federated servers URLs. The server will look to all federated servers and list their agents.',
        type: 'TEXT',
    },
    {
        key: 'IS_VOICE_CALLING_ENABLED',
        value: 'false',
        note: 'Enable or disable voice calling features for agents. When disabled, voice API endpoints will return 403 Forbidden.',
        type: 'BOOLEAN',
    },
] as const satisfies ReadonlyArray<{
    key: string;
    value: string;
    note: string;
    type: MetadataType;
}>;

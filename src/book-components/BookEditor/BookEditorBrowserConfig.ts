const color = (hex: string) => ({
    toHex: () => hex,
});

export const NAME = 'Promptbook';
export const CLAIM = "Create persistent AI agents that turn your company's scattered knowledge into action";
export const PROMPTBOOK_LEGAL_ENTITY = 'AI Web, LLC <legal@ptbk.io> (https://www.ptbk.io/)';
export const IS_COST_PREVENTED = false;
export const DEFAULT_IS_VERBOSE = false;
export const DEFAULT_MAX_CONCURRENT_UPLOADS = 3;

export const PUBLIC_AGENTS_SERVERS = [
    {
        title: 'Promptbook Core',
        description: 'Core Promptbook server used for Adam agent and other well known agents.',
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://core.ptbk.io/',
    },
    {
        title: 'Promptbook Gallery',
        description: 'Gallery of ideas and AI professions.',
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://gallery.ptbk.io/',
    },
    {
        title: 'Promptbook Testing server 6',
        description: 'General-purpose testing server.',
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://s6.ptbk.io/',
    },
    {
        title: 'Promptbook Testing server 7',
        description: 'General-purpose testing server.',
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://s7.ptbk.io/',
    },
    {
        title: 'Promptbook Testing server 8',
        description: 'General-purpose testing server.',
        owner: PROMPTBOOK_LEGAL_ENTITY,
        url: 'https://s8.ptbk.io/',
    },
];

export const PROMPTBOOK_SYNTAX_COLORS = {
    TITLE: color('#244EA8'),
    LINE: color('#eeeeee'),
    SEPARATOR: color('#cccccc'),
    COMMITMENT: color('#DA0F78'),
    NOTE_COMMITMENT: color('#8080807e'),
    TODO_COMMITMENT_TEXT: color('#000000'),
    TODO_COMMITMENT_BACKGROUND: color('#FFEB3B'),
    PARAMETER: color('#8e44ad'),
    CODE_BLOCK: color('#7700ffff'),
};

/**
 * One hyperlink used in the header or footer.
 */
export type PageLink = {
    /**
     * Visible text of the link
     */
    readonly title: string;

    /**
     * Target URL of the link
     */
    readonly href: string;
};

/**
 * One column of footer links.
 */
export type FooterColumn = {
    /**
     * Heading of the column
     */
    readonly heading: string;

    /**
     * Links inside the column
     */
    readonly links: ReadonlyArray<PageLink>;
};

/**
 * URL of the Promptbook GitHub repository which hosts `ptbk coder`.
 */
export const GITHUB_URL = 'https://github.com/webgptorg/promptbook';

/**
 * URL of the `ptbk` package on npm.
 */
export const NPM_PACKAGE_URL = 'https://www.npmjs.com/package/ptbk';

/**
 * Footer link columns, mirroring the footer of https://www.ptbk.io/en adjusted for `ptbk coder`.
 *
 * Note: Specified in [`specs/sections/footer.md`](../../specs/sections/footer.md)
 */
export const FOOTER_COLUMNS: ReadonlyArray<FooterColumn> = [
    {
        heading: 'ptbk coder',
        links: [
            { title: 'Get started', href: '#quickstart' },
            { title: 'Harnesses & models', href: '#harnesses' },
            { title: 'Documentation', href: GITHUB_URL },
            { title: 'npm package', href: NPM_PACKAGE_URL },
        ],
    },
    {
        heading: 'Promptbook',
        links: [
            { title: 'Promptbook.io', href: 'https://www.ptbk.io/en' },
            { title: 'Manifest', href: 'https://ptbk.io/manifest' },
            { title: 'Playground', href: 'https://promptbook.studio/miniapps/new' },
            { title: 'Branding', href: 'https://www.ptbk.io/branding' },
            { title: 'Blog', href: 'https://ptbk.io/blog' },
        ],
    },
    {
        heading: 'Company',
        links: [
            {
                title: 'AI Web s.r.o.',
                href: 'https://or-justice-cz.translate.goog/ias/ui/rejstrik-firma.vysledky?subjektId=1223693&typ=UPLNY&_x_tr_sl=cs&_x_tr_tl=en&_x_tr_hl=en-US&_x_tr_pto=wapp',
            },
            { title: 'About Us', href: 'https://ptbk.io/about' },
            { title: 'Contact', href: 'https://www.ptbk.io/contact' },
        ],
    },
    {
        heading: 'Connect',
        links: [
            { title: 'GitHub', href: GITHUB_URL },
            { title: 'LinkedIn', href: 'https://linkedin.com/company/promptbook' },
            { title: 'Discord', href: 'https://discord.gg/x3QWNaa89N' },
        ],
    },
];

/**
 * In-page anchor navigation shown in the header.
 */
export const HEADER_NAVIGATION: ReadonlyArray<PageLink> = [
    { title: 'How it works', href: '#how-it-works' },
    { title: 'Quickstart', href: '#quickstart' },
    { title: 'Agents', href: '#agents' },
    { title: 'Harnesses', href: '#harnesses' },
    { title: 'Features', href: '#features' },
];

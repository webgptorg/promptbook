/**
 * Npm packages which provide an executable Promptbook CLI.
 *
 * `ptbk` is the preferred package and forwards to `@promptbook/cli`; the latter can also be installed directly.
 *
 * @private internal utility of `promptbookCli`
 */
export const PROMPTBOOK_CLI_NPM_PACKAGE_NAMES = ['ptbk', '@promptbook/cli'] as const;

/**
 * Npm package which provides an executable Promptbook CLI.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliNpmPackageName = (typeof PROMPTBOOK_CLI_NPM_PACKAGE_NAMES)[number];

/**
 * Place where one Promptbook CLI package is installed.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliInstallationLocation = 'local-dependency' | 'local-development-dependency' | 'global';

/**
 * One installed Promptbook CLI package that can be updated.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliInstallation = {
    /**
     * Npm package that provides the CLI.
     */
    readonly npmPackageName: PromptbookCliNpmPackageName;

    /**
     * Version from the package's installed `package.json`.
     */
    readonly installedVersion: string;

    /**
     * Local manifest section or global npm installation containing the package.
     */
    readonly installationLocation: PromptbookCliInstallationLocation;
};

// Note: [🟡] Code for Promptbook CLI installation definitions [PromptbookCliInstallation](src/cli/cli-commands/common/promptbook-cli/PromptbookCliInstallation.ts) should never be published outside of `@promptbook/cli`

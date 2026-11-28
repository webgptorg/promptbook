import type { NpmPackageInstallationLocation } from '../npm/buildNpmPackageInstallCommand';

/**
 * Npm packages which directly provide the `ptbk` executable.
 *
 * `ptbk` is the preferred package and forwards to `@promptbook/cli`; the latter can also be installed directly.
 *
 * @private internal utility of `promptbookCli`
 */
export const PROMPTBOOK_CLI_NPM_PACKAGE_NAMES = ['ptbk', '@promptbook/cli'] as const;

/**
 * Npm package which directly provides the `ptbk` executable.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliNpmPackageName = (typeof PROMPTBOOK_CLI_NPM_PACKAGE_NAMES)[number];

/**
 * Place where one Promptbook CLI package is installed.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliInstallationLocation = NpmPackageInstallationLocation;

/**
 * Fields shared by local and global Promptbook CLI installations.
 *
 * @private internal utility of `PromptbookCliInstallation`
 */
type PromptbookCliInstallationBase = {
    /**
     * Npm package that provides the CLI.
     */
    readonly npmPackageName: PromptbookCliNpmPackageName;

    /**
     * Version from the installed package's `package.json`.
     */
    readonly installedVersion: string;
};

/**
 * One directly declared local Promptbook CLI installation.
 *
 * @private internal utility of `promptbookCli`
 */
export type LocalPromptbookCliInstallation = PromptbookCliInstallationBase & {
    /**
     * Local manifest section containing the package.
     */
    readonly installationLocation: Exclude<PromptbookCliInstallationLocation, 'global'>;

    /**
     * Project directory containing the `package.json` which declares the package.
     */
    readonly projectPath: string;
};

/**
 * One directly installed global Promptbook CLI package.
 *
 * @private internal utility of `promptbookCli`
 */
export type GlobalPromptbookCliInstallation = PromptbookCliInstallationBase & {
    readonly installationLocation: 'global';
};

/**
 * One local or global Promptbook CLI package that can be updated.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliInstallation = LocalPromptbookCliInstallation | GlobalPromptbookCliInstallation;

// Note: [🟡] Code for Promptbook CLI installation definitions [PromptbookCliInstallation](src/cli/cli-commands/common/promptbook-cli/PromptbookCliInstallation.ts) should never be published outside of `@promptbook/cli`

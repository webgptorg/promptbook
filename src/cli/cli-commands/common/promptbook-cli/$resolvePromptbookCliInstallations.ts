import { readFile } from 'fs/promises';
import { join } from 'path';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import {
    PROMPTBOOK_CLI_NPM_PACKAGE_NAMES,
    type PromptbookCliInstallation,
    type PromptbookCliInstallationLocation,
    type PromptbookCliNpmPackageName,
} from './PromptbookCliInstallation';

/**
 * Time limit for resolving npm's global `node_modules` directory.
 */
const NPM_GLOBAL_NODE_MODULES_PATH_COMMAND_TIMEOUT_MS = 30 * 1000;

/**
 * JSON object shape used while reading package manifests without assuming unrelated fields.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
type JsonObject = Readonly<Record<string, unknown>>;

/**
 * Finds every locally or globally installed Promptbook CLI package which can be updated.
 *
 * A local package must be declared directly in the current project's `package.json`; transitive packages are not
 * updated because this command must not change dependencies chosen by another package.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads package manifests and runs npm
 *
 * @private internal utility of `promptbookCli`
 */
export async function $resolvePromptbookCliInstallations(): Promise<ReadonlyArray<PromptbookCliInstallation>> {
    const [localInstallations, globalInstallations] = await Promise.all([
        $resolveLocalPromptbookCliInstallations(),
        $resolveGlobalPromptbookCliInstallations(),
    ]);

    return [...localInstallations, ...globalInstallations];
}

/**
 * Finds Promptbook CLI packages installed directly in the current project's dependencies.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
async function $resolveLocalPromptbookCliInstallations(): Promise<ReadonlyArray<PromptbookCliInstallation>> {
    const projectPath = process.cwd();
    const projectPackageJson = await $readJsonObject(join(projectPath, 'package.json'));

    if (projectPackageJson === null) {
        return [];
    }

    const installations = await Promise.all(
        PROMPTBOOK_CLI_NPM_PACKAGE_NAMES.map(async (npmPackageName) => {
            const installationLocation = resolveLocalPromptbookCliInstallationLocation(
                projectPackageJson,
                npmPackageName,
            );

            if (installationLocation === undefined) {
                return undefined;
            }

            const installedVersion = await $resolveInstalledNpmPackageVersion(
                join(projectPath, 'node_modules'),
                npmPackageName,
            );

            if (installedVersion === undefined) {
                return undefined;
            }

            return { npmPackageName, installedVersion, installationLocation };
        }),
    );

    return installations.filter(isDefined);
}

/**
 * Finds Promptbook CLI packages installed in npm's global `node_modules` directory.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
async function $resolveGlobalPromptbookCliInstallations(): Promise<ReadonlyArray<PromptbookCliInstallation>> {
    const globalNodeModulesPath = await $resolveNpmGlobalNodeModulesPath();

    if (globalNodeModulesPath === null) {
        return [];
    }

    const installations = await Promise.all(
        PROMPTBOOK_CLI_NPM_PACKAGE_NAMES.map(async (npmPackageName) => {
            const installedVersion = await $resolveInstalledNpmPackageVersion(globalNodeModulesPath, npmPackageName);

            if (installedVersion === undefined) {
                return undefined;
            }

            return {
                npmPackageName,
                installedVersion,
                installationLocation: 'global' as const,
            };
        }),
    );

    return installations.filter(isDefined);
}

/**
 * Resolves the current project's manifest section that declares a Promptbook CLI package.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
function resolveLocalPromptbookCliInstallationLocation(
    packageJson: JsonObject,
    npmPackageName: PromptbookCliNpmPackageName,
): PromptbookCliInstallationLocation | undefined {
    if (readNestedStringProperty(packageJson, 'dependencies', npmPackageName) !== undefined) {
        return 'local-dependency';
    }

    if (readNestedStringProperty(packageJson, 'devDependencies', npmPackageName) !== undefined) {
        return 'local-development-dependency';
    }

    return undefined;
}

/**
 * Reads an installed npm package version from a `node_modules` directory.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
async function $resolveInstalledNpmPackageVersion(
    nodeModulesPath: string,
    npmPackageName: PromptbookCliNpmPackageName,
): Promise<string | undefined> {
    const installedPackageJson = await $readJsonObject(join(nodeModulesPath, npmPackageName, 'package.json'));

    return installedPackageJson === null ? undefined : readStringProperty(installedPackageJson, 'version');
}

/**
 * Resolves npm's global `node_modules` directory without querying the registry.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
async function $resolveNpmGlobalNodeModulesPath(): Promise<string | null> {
    const output = await $execCommand({
        command: 'npm root --global',
        crashOnError: true,
        timeout: NPM_GLOBAL_NODE_MODULES_PATH_COMMAND_TIMEOUT_MS,
        isVerbose: false,
    }).catch(() => '');

    const globalNodeModulesPath = output.trim();
    return globalNodeModulesPath === '' ? null : globalNodeModulesPath;
}

/**
 * Reads a JSON object, returning `null` for missing or malformed files because update checks must stay advisory.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
async function $readJsonObject(filePath: string): Promise<JsonObject | null> {
    try {
        const parsedValue: unknown = JSON.parse(await readFile(filePath, 'utf8'));

        return isJsonObject(parsedValue) ? parsedValue : null;
    } catch {
        return null;
    }
}

/**
 * Checks whether an unknown value can be read as a JSON object.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads one string property from a JSON object.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
function readStringProperty(jsonObject: JsonObject, propertyName: string): string | undefined {
    const value = jsonObject[propertyName];

    return typeof value === 'string' ? value : undefined;
}

/**
 * Reads one string property nested under another JSON object property.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
function readNestedStringProperty(
    jsonObject: JsonObject,
    parentPropertyName: string,
    propertyName: string,
): string | undefined {
    const nestedValue = jsonObject[parentPropertyName];

    return isJsonObject(nestedValue) ? readStringProperty(nestedValue, propertyName) : undefined;
}

/**
 * Narrows an array after `undefined` values were removed.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
function isDefined<TValue>(value: TValue | undefined): value is TValue {
    return value !== undefined;
}

// Note: [🟡] Code for Promptbook CLI installation detection [$resolvePromptbookCliInstallations](src/cli/cli-commands/common/promptbook-cli/$resolvePromptbookCliInstallations.ts) should never be published outside of `@promptbook/cli`

import { readFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import {
    PROMPTBOOK_CLI_NPM_PACKAGE_NAMES,
    type LocalPromptbookCliInstallation,
    type PromptbookCliInstallation,
    type PromptbookCliInstallationLocation,
    type PromptbookCliNpmPackageName,
} from './PromptbookCliInstallation';

/**
 * Time limit for listing directly installed global npm packages.
 */
const NPM_GLOBAL_PACKAGE_LIST_COMMAND_TIMEOUT_MS = 30 * 1000;

/**
 * Filename of an npm package manifest.
 */
const PACKAGE_JSON_FILENAME = 'package.json';

/**
 * Directory containing locally installed npm packages.
 */
const NODE_MODULES_DIRECTORY_NAME = 'node_modules';

/**
 * JSON object shape used while reading package manifests without assuming unrelated fields.
 *
 * @private internal utility of `$resolvePromptbookCliInstallations`
 */
type JsonObject = Readonly<Record<string, unknown>>;

/**
 * Finds every directly declared local or directly installed global Promptbook CLI package which can be updated.
 *
 * Transitive packages are deliberately ignored because this command must update the dependency chosen by the current
 * project or global npm installation, not mutate a dependency owned by another package.
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
 * Finds the closest ancestor `package.json` which directly declares a Promptbook CLI package.
 */
async function $resolveLocalPromptbookCliInstallations(): Promise<ReadonlyArray<LocalPromptbookCliInstallation>> {
    let candidateProjectPath = resolve(process.cwd());
    let isFileSystemRootReached = false;

    while (!isFileSystemRootReached) {
        const projectPackageJson = await $readJsonObject(join(candidateProjectPath, PACKAGE_JSON_FILENAME));

        if (projectPackageJson !== null) {
            const declaredPackages = resolveDeclaredPromptbookCliPackages(projectPackageJson);

            if (declaredPackages.length > 0) {
                const installations = await Promise.all(
                    declaredPackages.map(async ({ npmPackageName, installationLocation }) => {
                        const installedVersion = await $resolveLocalInstalledNpmPackageVersion(
                            candidateProjectPath,
                            npmPackageName,
                        );

                        return installedVersion === null
                            ? undefined
                            : {
                                  npmPackageName,
                                  installedVersion,
                                  installationLocation,
                                  projectPath: candidateProjectPath,
                              };
                    }),
                );

                return installations.filter(isDefined);
            }
        }

        const parentPath = dirname(candidateProjectPath);
        isFileSystemRootReached = parentPath === candidateProjectPath;
        candidateProjectPath = parentPath;
    }

    return [];
}

/**
 * Finds Promptbook CLI package names declared in dependencies or development dependencies.
 */
function resolveDeclaredPromptbookCliPackages(packageJson: JsonObject): ReadonlyArray<{
    readonly npmPackageName: PromptbookCliNpmPackageName;
    readonly installationLocation: Exclude<PromptbookCliInstallationLocation, 'global'>;
}> {
    const declaredPackages: Array<{
        readonly npmPackageName: PromptbookCliNpmPackageName;
        readonly installationLocation: Exclude<PromptbookCliInstallationLocation, 'global'>;
    }> = [];

    for (const npmPackageName of PROMPTBOOK_CLI_NPM_PACKAGE_NAMES) {
        if (readNestedStringProperty(packageJson, 'dependencies', npmPackageName) !== undefined) {
            declaredPackages.push({ npmPackageName, installationLocation: 'local-dependency' });
            continue;
        }

        if (readNestedStringProperty(packageJson, 'devDependencies', npmPackageName) !== undefined) {
            declaredPackages.push({ npmPackageName, installationLocation: 'local-development-dependency' });
        }
    }

    return declaredPackages;
}

/**
 * Reads an installed local package version while following npm's ancestor `node_modules` lookup behavior.
 */
async function $resolveLocalInstalledNpmPackageVersion(
    projectPath: string,
    npmPackageName: PromptbookCliNpmPackageName,
): Promise<string | null> {
    let candidateNodeModulesParentPath = projectPath;
    let isFileSystemRootReached = false;

    while (!isFileSystemRootReached) {
        const installedPackageJson = await $readJsonObject(
            join(candidateNodeModulesParentPath, NODE_MODULES_DIRECTORY_NAME, npmPackageName, PACKAGE_JSON_FILENAME),
        );
        const installedVersion =
            installedPackageJson === null ? undefined : readStringProperty(installedPackageJson, 'version');

        if (installedVersion !== undefined) {
            return installedVersion;
        }

        const parentPath = dirname(candidateNodeModulesParentPath);
        isFileSystemRootReached = parentPath === candidateNodeModulesParentPath;
        candidateNodeModulesParentPath = parentPath;
    }

    return null;
}

/**
 * Finds Promptbook CLI packages listed by npm as direct global installations.
 */
async function $resolveGlobalPromptbookCliInstallations(): Promise<ReadonlyArray<PromptbookCliInstallation>> {
    const output = await $execCommand({
        command: 'npm list --global --depth=0 --json --loglevel=error',
        // Note: npm can return a non-zero status for an unrelated broken global package while still printing useful JSON
        crashOnError: false,
        timeout: NPM_GLOBAL_PACKAGE_LIST_COMMAND_TIMEOUT_MS,
        isVerbose: false,
    }).catch(() => '');
    const globalPackageList = parseJsonObjectFromCommandOutput(output);
    const globalDependencies =
        globalPackageList === null ? null : readObjectProperty(globalPackageList, 'dependencies');

    if (globalDependencies === null) {
        return [];
    }

    return PROMPTBOOK_CLI_NPM_PACKAGE_NAMES.flatMap((npmPackageName) => {
        const packageMetadata = readObjectProperty(globalDependencies, npmPackageName);
        const installedVersion = packageMetadata === null ? undefined : readStringProperty(packageMetadata, 'version');

        return installedVersion === undefined
            ? []
            : [{ npmPackageName, installedVersion, installationLocation: 'global' as const }];
    });
}

/**
 * Reads a JSON object, returning `null` for missing or malformed files because update checks must stay advisory.
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
 * Parses a JSON object from command output while tolerating npm warnings around the JSON payload.
 */
function parseJsonObjectFromCommandOutput(output: string): JsonObject | null {
    const jsonStartIndex = output.indexOf('{');
    const jsonEndIndex = output.lastIndexOf('}');

    if (jsonStartIndex === -1 || jsonEndIndex < jsonStartIndex) {
        return null;
    }

    try {
        const parsedValue: unknown = JSON.parse(output.slice(jsonStartIndex, jsonEndIndex + 1));

        return isJsonObject(parsedValue) ? parsedValue : null;
    } catch {
        return null;
    }
}

/**
 * Checks whether an unknown value can be read as a JSON object.
 */
function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads one string property from a JSON object.
 */
function readStringProperty(jsonObject: JsonObject, propertyName: string): string | undefined {
    const value = jsonObject[propertyName];

    return typeof value === 'string' ? value : undefined;
}

/**
 * Reads one object property from a JSON object.
 */
function readObjectProperty(jsonObject: JsonObject, propertyName: string): JsonObject | null {
    const value = jsonObject[propertyName];

    return isJsonObject(value) ? value : null;
}

/**
 * Reads one string property nested under another JSON object property.
 */
function readNestedStringProperty(
    jsonObject: JsonObject,
    parentPropertyName: string,
    propertyName: string,
): string | undefined {
    const nestedValue = readObjectProperty(jsonObject, parentPropertyName);

    return nestedValue === null ? undefined : readStringProperty(nestedValue, propertyName);
}

/**
 * Narrows an array after `undefined` values were removed.
 */
function isDefined<TValue>(value: TValue | undefined): value is TValue {
    return value !== undefined;
}

// Note: [🟡] Code for Promptbook CLI installation detection [$resolvePromptbookCliInstallations](src/cli/cli-commands/common/promptbook-cli/$resolvePromptbookCliInstallations.ts) should never be published outside of `@promptbook/cli`

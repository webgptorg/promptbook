import { readdir, readFile, stat } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { spaceTrim } from 'spacetrim';
import type { string_book, string_script } from '@promptbook-local/types';
import { sanitizeBackupPathSegment } from '../backup/sanitizeBackupPathSegment';
import { getTranspiledCodeFileMetadata } from './getTranspiledCodeFileMetadata';

/**
 * Stable filename used for the bundled source book.
 */
const AGENT_SOURCE_EXPORT_FILENAME = 'agent.book';

/**
 * Stable filename used for runtime instructions bundled into the export.
 */
const EXPORT_README_FILENAME = 'README.md';

/**
 * Stable filename used for the mocked runtime environment file.
 */
const EXPORT_ENV_FILENAME = '.env';

/**
 * Stable filename used for export Git ignores.
 */
const EXPORT_GITIGNORE_FILENAME = '.gitignore';

/**
 * Stable filename used for Node.js runtime metadata.
 */
const EXPORT_PACKAGE_JSON_FILENAME = 'package.json';

/**
 * Stable filename used for export metadata bundled into the ZIP archive.
 */
const EXPORT_MANIFEST_FILENAME = 'manifest.json';

/**
 * Prefix used for download filenames and ZIP root folders.
 */
const EXPORT_ARCHIVE_PREFIX = 'promptbook-agent-export';

/**
 * Fallback path segment when the agent name sanitizes to an empty value.
 */
const DEFAULT_AGENT_EXPORT_SEGMENT = 'agent';

/**
 * Fallback path segment when the transpiler name sanitizes to an empty value.
 */
const DEFAULT_TRANSPILER_EXPORT_SEGMENT = 'transpiler';

/**
 * Fallback npm package name used by self-contained Node.js exports.
 */
const DEFAULT_EXPORT_PACKAGE_NAME = 'promptbook-agent-export';

/**
 * Fallback dependency version used when the current workspace cannot resolve a package.
 */
const DEFAULT_FALLBACK_DEPENDENCY_VERSION = 'latest';

/**
 * Maximum npm package name length accepted by the npm registry.
 */
const MAXIMUM_NPM_PACKAGE_NAME_LENGTH = 214;

/**
 * Directory name containing Promptbook workspace packages.
 */
const WORKSPACE_PACKAGES_DIRECTORY_NAME = 'packages';

/**
 * Package name identifying the repository root.
 */
const WORKSPACE_ROOT_PACKAGE_NAME = 'promptbook';

/**
 * Runtime identifier used when the transpiled artifact is immediately runnable in Node.js.
 */
const NODEJS_RUNTIME_KIND = 'nodejs';

/**
 * Runtime identifier used when only manual usage instructions can be inferred.
 */
const MANUAL_RUNTIME_KIND = 'manual';

/**
 * File extensions treated as runnable Node.js entry points.
 */
const NODEJS_TRANSPILATION_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

/**
 * Bare import packages extracted from transpiled JavaScript code.
 */
const JAVASCRIPT_IMPORT_SPECIFIER_PATTERN =
    /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|\brequire\(\s*['"]([^'"]+)['"]\s*\)|\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Dot-notation `process.env` references extracted from transpiled JavaScript code.
 */
const PROCESS_ENV_DOT_NOTATION_PATTERN = /process\.env\.([A-Z][A-Z0-9_]*)/g;

/**
 * Bracket-notation `process.env` references extracted from transpiled JavaScript code.
 */
const PROCESS_ENV_BRACKET_NOTATION_PATTERN = /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g;

/**
 * Built-in Node.js module names in both legacy and `node:`-less forms.
 */
const BUILTIN_MODULE_NAMES = new Set(
    builtinModules.flatMap((moduleName) => [moduleName, moduleName.replace(/^node:/, '')]),
);

/**
 * Short human hints for well-known environment variables.
 */
const ENVIRONMENT_VARIABLE_HINTS: Record<string, string> = {
    OPENAI_API_KEY: 'Replace with the OpenAI API key used by the exported agent.',
};

/**
 * Minimal shape read from `package.json` files when inferring runtime dependency versions.
 */
type PackageJsonLike = {
    readonly name?: string;
    readonly version?: string;
    readonly dependencies?: Record<string, string>;
    readonly devDependencies?: Record<string, string>;
};

/**
 * Input consumed by the transpiled-code export artifact builder.
 */
export type CreateTranspiledAgentExportArtifactsOptions = {
    /**
     * Human-facing agent name used for filenames and manifest metadata.
     */
    readonly agentName: string;

    /**
     * Stored source book bundled into the export.
     */
    readonly agentSource: string_book;

    /**
     * Generated harness content bundled into the export.
     */
    readonly transpiledCode: string_script;

    /**
     * Machine identifier of the selected transpiler.
     */
    readonly transpilerName: string;

    /**
     * Human-facing title of the selected transpiler.
     */
    readonly transpilerTitle: string;
};

/**
 * One generated file included in the self-contained export.
 */
export type TranspiledAgentExportArtifactFile = {
    /**
     * Relative path of the file inside the export root folder.
     */
    readonly path: string;

    /**
     * UTF-8 file content written into the export.
     */
    readonly content: string;
};

/**
 * Runtime metadata stored in the export manifest.
 */
export type TranspiledAgentExportRuntime = {
    /**
     * Inferred runtime category for the generated export.
     */
    readonly kind: typeof NODEJS_RUNTIME_KIND | typeof MANUAL_RUNTIME_KIND;

    /**
     * Entry file of the generated transpiled artifact.
     */
    readonly entryFile: string;

    /**
     * Install command shown to the user when the export is runnable.
     */
    readonly installCommand: string | null;

    /**
     * Start command shown to the user when the export is runnable.
     */
    readonly startCommand: string | null;

    /**
     * Environment variables referenced directly by the transpiled code.
     */
    readonly environmentVariables: Array<string>;

    /**
     * Runtime dependencies inferred for executable exports.
     */
    readonly dependencies?: Record<string, string>;

    /**
     * Generated npm package name for executable Node.js exports.
     */
    readonly packageName?: string;
};

/**
 * Output payload returned by the transpiled-code export artifact builder.
 */
export type TranspiledAgentExportArtifacts = {
    /**
     * Suggested archive filename for the browser download.
     */
    readonly filename: string;

    /**
     * Root folder name used inside the ZIP archive.
     */
    readonly exportRootFolderName: string;

    /**
     * Generated files ready to be zipped or otherwise served to the user.
     */
    readonly files: Array<TranspiledAgentExportArtifactFile>;

    /**
     * Runtime metadata written into the export manifest.
     */
    readonly runtime: TranspiledAgentExportRuntime;
};

/**
 * Internal runtime scaffold containing the inferred runtime metadata together with the generated
 * helper files required by the export.
 */
type ResolvedRuntimeScaffold = {
    /**
     * Runtime metadata stored in the export manifest.
     */
    readonly runtime: TranspiledAgentExportRuntime;

    /**
     * Runtime helper files generated by the system around the transpiled artifact.
     */
    readonly files: Array<TranspiledAgentExportArtifactFile>;
};

/**
 * Cache of workspace package versions reused across export requests.
 */
let cachedAvailablePackageVersionsPromise: Promise<Map<string, string>> | null = null;

/**
 * Builds the full file set for one self-contained transpiled export. This keeps the transpiler
 * contract simple: transpilers return only the generated code and the system adds the surrounding
 * runtime scaffold, instructions, and manifest.
 *
 * @param options - Agent and transpiler data to include in the export.
 * @returns File list, runtime metadata, and the suggested archive filename.
 */
export async function createTranspiledAgentExportArtifacts(
    options: CreateTranspiledAgentExportArtifactsOptions,
): Promise<TranspiledAgentExportArtifacts> {
    const { agentName, agentSource, transpiledCode, transpilerName, transpilerTitle } = options;
    const { filename: transpiledCodeFilename } = getTranspiledCodeFileMetadata(transpilerName);
    const safeAgentSegment = sanitizeBackupPathSegment(agentName, DEFAULT_AGENT_EXPORT_SEGMENT);
    const safeTranspilerSegment = sanitizeBackupPathSegment(transpilerName, DEFAULT_TRANSPILER_EXPORT_SEGMENT);
    const exportRootFolderName = `${EXPORT_ARCHIVE_PREFIX}-${safeAgentSegment}-${safeTranspilerSegment}`;
    const runtimeScaffold = await resolveTranspiledAgentRuntimeScaffold({
        agentName,
        transpilerName,
        transpilerTitle,
        transpiledCodeFilename,
        transpiledCode,
    });
    const filesWithoutManifest = [
        {
            path: AGENT_SOURCE_EXPORT_FILENAME,
            content: agentSource,
        },
        {
            path: transpiledCodeFilename,
            content: transpiledCode,
        },
        ...runtimeScaffold.files,
    ] satisfies Array<TranspiledAgentExportArtifactFile>;
    const manifestFile: TranspiledAgentExportArtifactFile = {
        path: EXPORT_MANIFEST_FILENAME,
        content: createTranspiledAgentExportManifestContent({
            agentName,
            transpilerName,
            transpilerTitle,
            runtime: runtimeScaffold.runtime,
            files: [...filesWithoutManifest.map((file) => file.path), EXPORT_MANIFEST_FILENAME],
        }),
    };
    const files = [...filesWithoutManifest, manifestFile];

    return {
        filename: `${exportRootFolderName}.zip`,
        exportRootFolderName,
        files,
        runtime: runtimeScaffold.runtime,
    };
}

/**
 * Resolves the helper files and runtime metadata wrapped around the transpiled artifact.
 *
 * @param options - Export metadata and generated code used to infer the runtime scaffold.
 * @returns Runtime metadata plus helper files generated by the system.
 */
async function resolveTranspiledAgentRuntimeScaffold(options: {
    readonly agentName: string;
    readonly transpilerName: string;
    readonly transpilerTitle: string;
    readonly transpiledCodeFilename: string;
    readonly transpiledCode: string_script;
}): Promise<ResolvedRuntimeScaffold> {
    const { agentName, transpilerName, transpilerTitle, transpiledCodeFilename, transpiledCode } = options;
    const environmentVariables = extractReferencedEnvironmentVariables(transpiledCode);
    const commonFiles = [
        {
            path: EXPORT_ENV_FILENAME,
            content: createMockEnvironmentFile(environmentVariables),
        },
        {
            path: EXPORT_GITIGNORE_FILENAME,
            content: createExportGitignoreFile(),
        },
    ] satisfies Array<TranspiledAgentExportArtifactFile>;

    if (isNodeJsTranspiledArtifact(transpiledCodeFilename)) {
        const dependencies = await resolveJavascriptRuntimeDependencies(transpiledCode);
        const packageName = createExportPackageName(agentName, transpilerName);
        const runtime: TranspiledAgentExportRuntime = {
            kind: NODEJS_RUNTIME_KIND,
            entryFile: transpiledCodeFilename,
            installCommand: 'npm install',
            startCommand: 'npm start',
            environmentVariables,
            dependencies,
            packageName,
        };

        return {
            runtime,
            files: [
                ...commonFiles,
                {
                    path: EXPORT_PACKAGE_JSON_FILENAME,
                    content: createNodeJsPackageJsonFile({
                        agentName,
                        transpilerTitle,
                        transpiledCodeFilename,
                        packageName,
                        dependencies,
                    }),
                },
                {
                    path: EXPORT_README_FILENAME,
                    content: createNodeJsReadmeFile({
                        agentName,
                        transpilerTitle,
                        transpiledCodeFilename,
                        environmentVariables,
                    }),
                },
            ],
        };
    }

    const runtime: TranspiledAgentExportRuntime = {
        kind: MANUAL_RUNTIME_KIND,
        entryFile: transpiledCodeFilename,
        installCommand: null,
        startCommand: null,
        environmentVariables,
    };

    return {
        runtime,
        files: [
            ...commonFiles,
            {
                path: EXPORT_README_FILENAME,
                content: createManualRuntimeReadmeFile({
                    agentName,
                    transpilerTitle,
                    transpiledCodeFilename,
                    environmentVariables,
                }),
            },
        ],
    };
}

/**
 * Creates the `package.json` file for self-contained Node.js exports.
 *
 * @param options - Runtime metadata used to generate the package file.
 * @returns Serialized `package.json` content with a trailing newline.
 */
function createNodeJsPackageJsonFile(options: {
    readonly agentName: string;
    readonly transpilerTitle: string;
    readonly transpiledCodeFilename: string;
    readonly packageName: string;
    readonly dependencies: Record<string, string>;
}): string {
    const { agentName, transpilerTitle, transpiledCodeFilename, packageName, dependencies } = options;
    const packageJson = {
        name: packageName,
        private: true,
        version: '0.0.0',
        description: `Self-contained Promptbook agent export for ${agentName} (${transpilerTitle})`,
        type: 'module',
        scripts: {
            start: `node ./${transpiledCodeFilename}`,
        },
        engines: {
            node: '>=18.18.0',
            npm: '>=8.0.0',
        },
        dependencies,
    };

    return `${JSON.stringify(packageJson, null, 2)}\n`;
}

/**
 * Creates the README shipped with runnable Node.js exports.
 *
 * @param options - Runtime metadata shown to the user.
 * @returns Markdown instructions with a trailing newline.
 */
function createNodeJsReadmeFile(options: {
    readonly agentName: string;
    readonly transpilerTitle: string;
    readonly transpiledCodeFilename: string;
    readonly environmentVariables: Array<string>;
}): string {
    const { agentName, transpilerTitle, transpiledCodeFilename, environmentVariables } = options;

    return `${spaceTrim(
        (block) => `
            # ${agentName}

            This archive was generated by Promptbook Agents Server using the \`${transpilerTitle}\` transpiler.
            It is self-contained and ready to run as a standalone Node.js agent.

            ## Quick start

            1. Open \`.env\` and replace the placeholder values.
            2. Run \`npm install\`.
            3. Run \`npm start\`.

            ## Included files

            - \`${transpiledCodeFilename}\` is the runnable transpiled entry point.
            - \`agent.book\` stores the original Promptbook source.
            - \`manifest.json\` describes the generated export.

            ${block(createEnvironmentVariablesReadmeSection(environmentVariables))}
        `,
    )}\n`;
}

/**
 * Creates the README shipped with non-runnable or manually runnable exports.
 *
 * @param options - Runtime metadata shown to the user.
 * @returns Markdown instructions with a trailing newline.
 */
function createManualRuntimeReadmeFile(options: {
    readonly agentName: string;
    readonly transpilerTitle: string;
    readonly transpiledCodeFilename: string;
    readonly environmentVariables: Array<string>;
}): string {
    const { agentName, transpilerTitle, transpiledCodeFilename, environmentVariables } = options;

    return `${spaceTrim(
        (block) => `
            # ${agentName}

            This archive was generated by Promptbook Agents Server using the \`${transpilerTitle}\` transpiler.
            The system bundled the transpiled output together with the original \`agent.book\`, a mocked \`.env\`, and basic project housekeeping files.

            The main exported artifact is \`${transpiledCodeFilename}\`.
            No automatic \`npm install\` / \`npm start\` runtime scaffold could be inferred for this transpiler, so review the artifact and adapt the runtime manually if needed.

            ${block(createEnvironmentVariablesReadmeSection(environmentVariables))}
        `,
    )}\n`;
}

/**
 * Creates the reusable README section describing environment variables required by the export.
 *
 * @param environmentVariables - Variables referenced by the transpiled code.
 * @returns Markdown fragment without leading/trailing blank lines.
 */
function createEnvironmentVariablesReadmeSection(environmentVariables: Array<string>): string {
    if (environmentVariables.length === 0) {
        return 'No required environment variables were detected automatically in the transpiled code.';
    }

    return spaceTrim(
        (block) => `
            ## Environment variables

            Fill these values in \`.env\` before running the export:

            ${block(environmentVariables.map((environmentVariable) => `- \`${environmentVariable}\``).join('\n'))}
        `,
    );
}

/**
 * Creates the mocked `.env` file shipped with every transpiled export.
 *
 * @param environmentVariables - Variables referenced by the transpiled code.
 * @returns Mocked environment file content with a trailing newline.
 */
function createMockEnvironmentFile(environmentVariables: Array<string>): string {
    if (environmentVariables.length === 0) {
        return `${spaceTrim(`
            # This mocked \`.env\` file is included so the exported agent remains self-contained.
            # No required \`process.env\` variables were detected in the transpiled code.
            # Add any local secrets here if you extend the runtime.
        `)}\n`;
    }

    return `${spaceTrim(
        (block) => `
            # This mocked \`.env\` file is included so the exported agent remains self-contained.
            # Replace every placeholder before running the exported agent.
            # Keep this file private. The bundled \`.gitignore\` already ignores it.

            ${block(environmentVariables.map((environmentVariable) => createEnvironmentVariableEntry(environmentVariable)).join('\n\n'))}
        `,
    )}\n`;
}

/**
 * Creates one `.env` entry including a short hint and placeholder value.
 *
 * @param environmentVariable - Referenced environment variable name.
 * @returns One `.env` section.
 */
function createEnvironmentVariableEntry(environmentVariable: string): string {
    const hint =
        ENVIRONMENT_VARIABLE_HINTS[environmentVariable] ||
        'Replace with the real value required by the exported agent at runtime.';

    return spaceTrim(`
        # ${environmentVariable}
        # ${hint}
        ${environmentVariable}="TODO_REPLACE_WITH_${environmentVariable}"
    `);
}

/**
 * Creates the shared `.gitignore` bundled with every export.
 *
 * @returns `.gitignore` content with a trailing newline.
 */
function createExportGitignoreFile(): string {
    return `${spaceTrim(`
        node_modules/
        .env
        .env.*
        npm-debug.log*
        yarn-debug.log*
        yarn-error.log*
        pnpm-debug.log*
        .DS_Store
        Thumbs.db
    `)}\n`;
}

/**
 * Creates the machine-readable export manifest bundled into the archive.
 *
 * @param options - Metadata stored in the manifest file.
 * @returns Serialized manifest content with a trailing newline.
 */
function createTranspiledAgentExportManifestContent(options: {
    readonly agentName: string;
    readonly transpilerName: string;
    readonly transpilerTitle: string;
    readonly runtime: TranspiledAgentExportRuntime;
    readonly files: Array<string>;
}): string {
    const { agentName, transpilerName, transpilerTitle, runtime, files } = options;

    return `${JSON.stringify(
        {
            agentName,
            transpilerName,
            transpilerTitle,
            runtime,
            files,
        },
        null,
        2,
    )}\n`;
}

/**
 * Resolves runtime dependency versions for transpiled JavaScript code by combining the repository
 * dependency map with generated import statements.
 *
 * @param transpiledCode - Generated JavaScript code.
 * @returns Dependency versions suitable for a generated `package.json`.
 */
async function resolveJavascriptRuntimeDependencies(transpiledCode: string_script): Promise<Record<string, string>> {
    const importedPackages = extractImportedJavascriptPackages(transpiledCode);
    const availablePackageVersions = await resolveAvailablePackageVersions();

    return Object.fromEntries(
        [...importedPackages]
            .sort((leftPackageName, rightPackageName) => leftPackageName.localeCompare(rightPackageName))
            .map((packageName) => [packageName, availablePackageVersions.get(packageName) || DEFAULT_FALLBACK_DEPENDENCY_VERSION]),
    );
}

/**
 * Extracts bare imported package names from generated JavaScript code.
 *
 * @param transpiledCode - Generated JavaScript code.
 * @returns Bare imported package names without built-in modules or relative paths.
 */
function extractImportedJavascriptPackages(transpiledCode: string_script): Set<string> {
    const packageNames = new Set<string>();

    for (const match of transpiledCode.matchAll(JAVASCRIPT_IMPORT_SPECIFIER_PATTERN)) {
        const rawSpecifier = match[1] || match[2] || match[3];

        if (!rawSpecifier) {
            continue;
        }

        const normalizedPackageName = normalizeImportedPackageName(rawSpecifier);
        if (normalizedPackageName) {
            packageNames.add(normalizedPackageName);
        }
    }

    return packageNames;
}

/**
 * Normalizes one import specifier to the owning npm package name.
 *
 * @param importSpecifier - Raw module specifier extracted from transpiled code.
 * @returns Bare package name or `null` when the specifier is relative, absolute, or built-in.
 */
function normalizeImportedPackageName(importSpecifier: string): string | null {
    if (importSpecifier.startsWith('.') || importSpecifier.startsWith('/') || importSpecifier.startsWith('node:')) {
        return null;
    }

    const barePackageName = importSpecifier.startsWith('@')
        ? importSpecifier.split('/').slice(0, 2).join('/')
        : importSpecifier.split('/')[0]!;

    if (BUILTIN_MODULE_NAMES.has(barePackageName)) {
        return null;
    }

    return barePackageName;
}

/**
 * Extracts environment variables referenced directly in the transpiled code.
 *
 * @param transpiledCode - Generated transpiled code.
 * @returns Sorted unique environment variable names.
 */
function extractReferencedEnvironmentVariables(transpiledCode: string_script): Array<string> {
    const environmentVariables = new Set<string>();

    for (const match of transpiledCode.matchAll(PROCESS_ENV_DOT_NOTATION_PATTERN)) {
        environmentVariables.add(match[1]!);
    }

    for (const match of transpiledCode.matchAll(PROCESS_ENV_BRACKET_NOTATION_PATTERN)) {
        environmentVariables.add(match[1]!);
    }

    return [...environmentVariables].sort((leftVariable, rightVariable) => leftVariable.localeCompare(rightVariable));
}

/**
 * Resolves the dependency version map used when creating self-contained runtime packages.
 *
 * @returns Available dependency versions from the current Promptbook workspace.
 */
async function resolveAvailablePackageVersions(): Promise<Map<string, string>> {
    if (!cachedAvailablePackageVersionsPromise) {
        cachedAvailablePackageVersionsPromise = loadAvailablePackageVersions();
    }

    return cachedAvailablePackageVersionsPromise;
}

/**
 * Loads the dependency version map from the current workspace root and generated packages.
 *
 * @returns Dependency version map used for generated runtime packages.
 */
async function loadAvailablePackageVersions(): Promise<Map<string, string>> {
    const availablePackageVersions = new Map<string, string>();
    const workspaceRootDirectory = await findWorkspaceRootDirectory(process.cwd());

    if (!workspaceRootDirectory) {
        return availablePackageVersions;
    }

    const rootPackageJson = await readPackageJson(join(workspaceRootDirectory, 'package.json'));
    appendDependencyVersions(availablePackageVersions, rootPackageJson);

    try {
        const packageDirectoryEntries = await readdir(join(workspaceRootDirectory, WORKSPACE_PACKAGES_DIRECTORY_NAME), {
            withFileTypes: true,
        });

        for (const packageDirectoryEntry of packageDirectoryEntries) {
            if (!packageDirectoryEntry.isDirectory()) {
                continue;
            }

            const packageJson = await readPackageJson(
                join(workspaceRootDirectory, WORKSPACE_PACKAGES_DIRECTORY_NAME, packageDirectoryEntry.name, 'package.json'),
            );

            if (packageJson?.name && packageJson.version) {
                availablePackageVersions.set(packageJson.name, packageJson.version);
            }
        }
    } catch {
        // Keep the dependency map limited to the root package file when the generated packages are unavailable.
    }

    return availablePackageVersions;
}

/**
 * Walks upwards from the current working directory until the Promptbook workspace root is found.
 *
 * @param startDirectory - Directory from which the search should begin.
 * @returns Absolute workspace root or `null` when it cannot be located.
 */
async function findWorkspaceRootDirectory(startDirectory: string): Promise<string | null> {
    const currentDirectory = resolve(startDirectory);
    const packageJson = await readPackageJson(join(currentDirectory, 'package.json'));

    if (
        packageJson?.name === WORKSPACE_ROOT_PACKAGE_NAME ||
        (await isDirectory(join(currentDirectory, WORKSPACE_PACKAGES_DIRECTORY_NAME)))
    ) {
        return currentDirectory;
    }

    const parentDirectory = resolve(currentDirectory, '..');
    if (parentDirectory === currentDirectory) {
        return null;
    }

    return findWorkspaceRootDirectory(parentDirectory);
}

/**
 * Appends dependency versions from one `package.json` object into the resolved version map.
 *
 * @param availablePackageVersions - Mutable version map shared across the current export request.
 * @param packageJson - Parsed package file to read from.
 */
function appendDependencyVersions(
    availablePackageVersions: Map<string, string>,
    packageJson: PackageJsonLike | null,
): void {
    if (!packageJson) {
        return;
    }

    for (const [packageName, version] of Object.entries(packageJson.dependencies || {})) {
        availablePackageVersions.set(packageName, version);
    }

    for (const [packageName, version] of Object.entries(packageJson.devDependencies || {})) {
        availablePackageVersions.set(packageName, version);
    }
}

/**
 * Reads and parses one `package.json` file.
 *
 * @param packageJsonPath - Absolute path to the package file.
 * @returns Parsed package metadata or `null` when the file cannot be read.
 */
async function readPackageJson(packageJsonPath: string): Promise<PackageJsonLike | null> {
    try {
        return JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJsonLike;
    } catch {
        return null;
    }
}

/**
 * Checks whether one absolute path currently points to a directory.
 *
 * @param directoryPath - Absolute path to validate.
 * @returns `true` when the path exists and is a directory.
 */
async function isDirectory(directoryPath: string): Promise<boolean> {
    try {
        return (await stat(directoryPath)).isDirectory();
    } catch {
        return false;
    }
}

/**
 * Resolves whether the generated artifact can be wrapped in a self-contained Node.js package.
 *
 * @param transpiledCodeFilename - Generated artifact filename.
 * @returns `true` when the artifact is a JavaScript entry point.
 */
function isNodeJsTranspiledArtifact(transpiledCodeFilename: string): boolean {
    return NODEJS_TRANSPILATION_EXTENSIONS.has(extname(transpiledCodeFilename).toLowerCase());
}

/**
 * Creates a stable npm package name for generated runnable exports.
 *
 * @param agentName - Human-facing agent name.
 * @param transpilerName - Selected transpiler identifier.
 * @returns Sanitized npm package name.
 */
function createExportPackageName(agentName: string, transpilerName: string): string {
    const slug = `${agentName}-${transpilerName}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    const packageName = slug ? `${DEFAULT_EXPORT_PACKAGE_NAME}-${slug}` : DEFAULT_EXPORT_PACKAGE_NAME;

    return packageName.slice(0, MAXIMUM_NPM_PACKAGE_NAME_LENGTH).replace(/-+$/g, '') || DEFAULT_EXPORT_PACKAGE_NAME;
}

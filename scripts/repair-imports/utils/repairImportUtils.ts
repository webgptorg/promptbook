import { dirname, join, normalize } from 'path';
import { spaceTrim } from 'spacetrim';
import * as ts from 'typescript';
import type { EntityMetadata } from '../../utils/findAllProjectEntities';

/**
 * Prefix for temporary type aliases that keep type-syntax imports visible during import organization.
 */
const ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_PREFIX = '__RepairImportsTypeUsage';

/**
 * Marker for temporary type aliases that must be removed after import organization.
 */
const ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_MARKER = 'REPAIR_IMPORTS_ORGANIZE_TYPE_USAGE_WORKAROUND';

/**
 * Pattern matching temporary aliases inserted before import organization.
 */
const ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_REGEX = new RegExp(
    `^type ${ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_PREFIX}\\d+ = [^\\r\\n]+; // ${ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_MARKER}\\r?\\n?`,
    'gm',
);

/**
 * Parsed metadata for one named import specifier.
 */
export type ParsedNamedImportSpecifier = {
    /**
     * Exported name that should be resolved in the project.
     */
    readonly importedName: string;

    /**
     * Text that should stay inside the braces of the generated import.
     */
    readonly renderedName: string;

    /**
     * Whether the source import explicitly requested a type-only import.
     */
    readonly isType: boolean;
};

/**
 * Options for rendering one repaired named import statement.
 */
export type RenderNamedImportStatementOptions = {
    /**
     * Relative module path used in the generated import statement.
     */
    readonly importFrom: string;

    /**
     * Parsed import specifier to render.
     */
    readonly importedSpecifier: ParsedNamedImportSpecifier;
};

/**
 * Parses the content of `{ ... }` from a named import statement.
 */
export function parseNamedImportSpecifiers(
    rawImportSpecifiers: string,
    isTypeImport: boolean,
): ReadonlyArray<ParsedNamedImportSpecifier> {
    return rawImportSpecifiers
        .split(',')
        .map((importSpecifier) => spaceTrim(importSpecifier))
        .filter((importSpecifier) => importSpecifier !== '')
        .map((importSpecifier) => {
            const parsedImportSpecifier =
                /^(?<typeModifier>type\s+)?(?<importedName>[a-zA-Z0-9_$]+)(?:\s+as\s+(?<localName>[a-zA-Z0-9_$]+))?$/.exec(
                    importSpecifier,
                );

            if (!parsedImportSpecifier?.groups) {
                throw new Error(`Unsupported import specifier: \`${importSpecifier}\``);
            }

            const { typeModifier, importedName, localName } = parsedImportSpecifier.groups;

            if (!importedName) {
                throw new Error(`Missing imported name in specifier: \`${importSpecifier}\``);
            }

            const renderedName = localName ? `${importedName} as ${localName}` : importedName;

            return {
                importedName,
                renderedName,
                isType: isTypeImport || Boolean(typeModifier),
            };
        });
}

/**
 * Renders one repaired named import statement.
 *
 * Note: We only preserve explicit `type` modifiers already present in the source import.
 * Some repository files intentionally use normal imports for type-only symbols because
 * downstream import organization can otherwise remove them around `satisfies` / `as` usages.
 */
export function renderNamedImportStatement({
    importFrom,
    importedSpecifier,
}: RenderNamedImportStatementOptions): string {
    return `import ${importedSpecifier.isType ? `type ` : ``}{ ${importedSpecifier.renderedName} } from '${importFrom}';`;
}

/**
 * Adds temporary type aliases for imported names used by `satisfies` / `as` type syntax.
 *
 * `organize-imports-cli` currently misses some of these references and drops their imports.
 * The aliases are removed immediately after the organize pass.
 */
export function addOrganizeImportsTypeUsageWorkarounds(filePath: string, fileContent: string): string {
    const importedTypeUsageNames = findImportedTypeUsageNames(filePath, fileContent);

    if (importedTypeUsageNames.length === 0) {
        return fileContent;
    }

    const workarounds = importedTypeUsageNames.map(
        (importedTypeUsageName, index) =>
            `type ${ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_PREFIX}${index} = ${importedTypeUsageName}; // ${ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_MARKER}`,
    );

    return `${fileContent.trimEnd()}\n\n${workarounds.join('\n')}\n`;
}

/**
 * Removes temporary type aliases inserted before import organization.
 */
export function removeOrganizeImportsTypeUsageWorkarounds(fileContent: string): string {
    return fileContent.replace(ORGANIZE_IMPORTS_TYPE_USAGE_WORKAROUND_REGEX, '');
}

/**
 * Options for resolving a named import to a concrete exported entity.
 */
export type ResolveImportEntityOptions = {
    /**
     * File containing the import statement.
     */
    readonly currentFilePath: string;

    /**
     * Relative module path from the original import statement.
     */
    readonly currentImportPath: string;

    /**
     * Imported export name that should be located.
     */
    readonly importedName: string;

    /**
     * All indexed project entities available to the repair script.
     */
    readonly allEntities: ReadonlyArray<EntityMetadata>;
};

/**
 * Resolves an imported name to the most appropriate indexed entity.
 */
export function resolveImportEntity({
    allEntities,
    currentFilePath,
    currentImportPath,
    importedName,
}: ResolveImportEntityOptions): EntityMetadata | undefined {
    const entitiesByName = allEntities.filter((entity) => entity.name === importedName);
    const currentImportCandidatePaths = resolveRelativeImportCandidatePaths(currentFilePath, currentImportPath);
    const entitiesInCurrentlyImportedModule = entitiesByName.filter((entity) =>
        currentImportCandidatePaths.has(normalizePath(entity.filename)),
    );

    if (entitiesInCurrentlyImportedModule.length === 1) {
        return entitiesInCurrentlyImportedModule[0];
    }

    const preferredRepositoryArea = resolvePreferredRepositoryArea(currentImportCandidatePaths);
    if (preferredRepositoryArea) {
        const entitiesInPreferredArea = entitiesByName.filter(
            (entity) => resolveRepositoryArea(entity.filename) === preferredRepositoryArea,
        );

        if (entitiesInPreferredArea.length === 1) {
            return entitiesInPreferredArea[0];
        }
    }

    if (entitiesByName.length === 1) {
        return entitiesByName[0];
    }

    return undefined;
}

/**
 * Computes the candidate filenames that a relative module path may resolve to.
 */
function resolveRelativeImportCandidatePaths(currentFilePath: string, currentImportPath: string): ReadonlySet<string> {
    const importBasePath = normalizePath(join(dirname(currentFilePath), currentImportPath));
    const candidates = [
        importBasePath,
        `${importBasePath}.ts`,
        `${importBasePath}.tsx`,
        `${importBasePath}.js`,
        `${importBasePath}.jsx`,
        join(importBasePath, 'index.ts'),
        join(importBasePath, 'index.tsx'),
        join(importBasePath, 'index.js'),
        join(importBasePath, 'index.jsx'),
    ];

    return new Set(candidates.map(normalizePath));
}

/**
 * Normalizes a file path for reliable comparisons on every platform.
 */
function normalizePath(path: string): string {
    return normalize(path).split('\\').join('/');
}

/**
 * Detects whether an import is clearly targeting repository `src` or `scripts`.
 */
function resolvePreferredRepositoryArea(candidatePaths: ReadonlySet<string>): 'src' | 'scripts' | undefined {
    const repositoryAreas = Array.from(candidatePaths)
        .map(resolveRepositoryArea)
        .filter((repositoryArea): repositoryArea is 'src' | 'scripts' => repositoryArea !== undefined);

    return new Set(repositoryAreas).size === 1 ? repositoryAreas[0] : undefined;
}

/**
 * Resolves the top-level repository area for a normalized absolute path.
 */
function resolveRepositoryArea(path: string): 'src' | 'scripts' | undefined {
    const normalizedPath = normalizePath(path);

    if (normalizedPath.includes('/src/')) {
        return 'src';
    }

    if (normalizedPath.includes('/scripts/')) {
        return 'scripts';
    }

    return undefined;
}

/**
 * Finds imported local names referenced only in type syntax missed by `organize-imports-cli`.
 */
function findImportedTypeUsageNames(filePath: string, fileContent: string): ReadonlyArray<string> {
    const sourceFile = parseTypescriptSourceFile(filePath, fileContent);
    const importedLocalNames = findImportedLocalNames(sourceFile);
    const importedTypeUsageNames = new Set<string>();

    /**
     * Visits nodes that can contain missed type references.
     */
    function visitNode(node: ts.Node): void {
        if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isTypeAssertionExpression(node)) {
            collectImportedIdentifiers(node.type, importedLocalNames, importedTypeUsageNames);
        }

        ts.forEachChild(node, visitNode);
    }

    visitNode(sourceFile);

    return Array.from(importedTypeUsageNames).sort();
}

/**
 * Finds local identifiers introduced by imports in one source file.
 */
function findImportedLocalNames(sourceFile: ts.SourceFile): ReadonlySet<string> {
    const importedLocalNames = new Set<string>();

    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || !statement.importClause) {
            continue;
        }

        const { importClause } = statement;

        if (importClause.name) {
            importedLocalNames.add(importClause.name.text);
        }

        if (!importClause.namedBindings) {
            continue;
        }

        if (ts.isNamespaceImport(importClause.namedBindings)) {
            importedLocalNames.add(importClause.namedBindings.name.text);
            continue;
        }

        for (const importSpecifier of importClause.namedBindings.elements) {
            importedLocalNames.add(importSpecifier.name.text);
        }
    }

    return importedLocalNames;
}

/**
 * Collects imported identifiers referenced inside one type node.
 */
function collectImportedIdentifiers(
    node: ts.Node,
    importedLocalNames: ReadonlySet<string>,
    importedTypeUsageNames: Set<string>,
): void {
    if (ts.isIdentifier(node) && importedLocalNames.has(node.text)) {
        importedTypeUsageNames.add(node.text);
    }

    ts.forEachChild(node, (childNode) =>
        collectImportedIdentifiers(childNode, importedLocalNames, importedTypeUsageNames),
    );
}

/**
 * Parses TypeScript and TSX files with the matching script kind.
 */
function parseTypescriptSourceFile(filePath: string, fileContent: string): ts.SourceFile {
    const scriptKind = filePath.endsWith('.tsx')
        ? ts.ScriptKind.TSX
        : filePath.endsWith('.jsx')
        ? ts.ScriptKind.JSX
        : filePath.endsWith('.js')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

    return ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true, scriptKind);
}

// Note: [⚫] Code for repository script [repairImportUtils](scripts/repair-imports/utils/repairImportUtils.ts) should never be published in any package

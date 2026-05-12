import { dirname, join, normalize } from 'path';
import { spaceTrim } from 'spacetrim';
import type { EntityMetadata } from '../../utils/findAllProjectEntities';

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
     * Whether the import should become type-only.
     */
    readonly isType: boolean;
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

// Note: [⚫] Code for repository script [repairImportUtils](scripts/repair-imports/utils/repairImportUtils.ts) should never be published in any package

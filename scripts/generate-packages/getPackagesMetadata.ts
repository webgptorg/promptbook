import colors from 'colors';
import { spaceTrim } from 'spacetrim';
import { getPackagesMetadataForRollup } from '../../rollup.config';
import { EntityMetadata, findAllProjectEntities } from '../utils/findAllProjectEntities';
import type { PackageMetadata } from './PackageMetadata';

/**
 * One buffered validation problem found while collecting package metadata.
 */
type PackageMetadataError = {
    readonly entity: EntityMetadata;
    readonly message: string;
};

/**
 * Parsed export-related annotation details for a single project entity.
 */
type EntityPackageAnnotationMetadata = {
    readonly annotation: string;
    readonly entity: EntityMetadata;
    readonly exportedFromPackageNames: ReadonlyArray<string>;
    readonly isGenerated: boolean;
    readonly isPrivate: boolean;
    readonly isPublic: boolean;
};

/**
 * Gets metadata of all packages of Promptbook ecosystem
 *
 * There are 2 similar functions:
 * - `getPackagesMetadata` Async version with declared types and extended information, use this in scripts
 * - `getPackagesMetadataForRollup` - Sync version with less information, use this ONLY in rollup config
 */
export async function getPackagesMetadata(): Promise<Array<PackageMetadata>> {
    const errors: Array<PackageMetadataError> = [/* <- Note: Buffering errors to show all at once */];
    const packagesMetadata = getPackagesMetadataForRollup() as Array<PackageMetadata>;
    const entities = await findAllProjectEntities();
    const packageNames = new Set(packagesMetadata.map(({ packageFullname }) => packageFullname));
    const entitiesAnnotations = entities.map(analyzeEntityPackageAnnotation);

    initializePackageEntities(packagesMetadata);
    collectInvalidPackageAnnotationErrors(entitiesAnnotations, packageNames, errors);
    assignEntitiesToPackages(packagesMetadata, entitiesAnnotations, errors);
    collectEntityVisibilityErrors(packagesMetadata, entitiesAnnotations, errors);
    throwPackageMetadataErrorsIfAny(errors);

    return packagesMetadata;
}

/**
 * Prepares each package metadata record for entity collection.
 *
 * @param packagesMetadata - Metadata of all generated packages
 */
function initializePackageEntities(packagesMetadata: ReadonlyArray<PackageMetadata>): void {
    for (const packageMetadata of packagesMetadata) {
        packageMetadata.entities = [];
    }
}

/**
 * Parses export-related tags once so later steps can work with simple booleans and package names.
 *
 * @param entity - Project entity to inspect
 * @returns Parsed annotation details
 */
function analyzeEntityPackageAnnotation(entity: EntityMetadata): EntityPackageAnnotationMetadata {
    const annotation = entity.annotation || '';
    const publicMatches = annotation.matchAll(/@public(?:\s+)exported(?:\s+)from(?:\s+)`(?<packageName>.*?)`/gi);
    const exportedFromPackageNames = Array.from(publicMatches, (match) => match.groups?.packageName).filter(
        (packageName): packageName is string => packageName !== undefined,
    );

    return {
        annotation,
        entity,
        exportedFromPackageNames,
        isGenerated: annotation.includes('@generated'),
        isPrivate: annotation.includes('@private'),
        isPublic: annotation.includes('@public'),
    };
}

/**
 * Reports invalid `@public exported from` declarations before entities are assigned to packages.
 *
 * @param entitiesAnnotations - Parsed entity annotations
 * @param packageNames - Valid generated package names
 * @param errors - Buffered validation problems
 */
function collectInvalidPackageAnnotationErrors(
    entitiesAnnotations: ReadonlyArray<EntityPackageAnnotationMetadata>,
    packageNames: ReadonlySet<string>,
    errors: Array<PackageMetadataError>,
): void {
    for (const entityAnnotation of entitiesAnnotations) {
        const { entity, exportedFromPackageNames, isPublic } = entityAnnotation;

        if (isPublic && exportedFromPackageNames.length === 0) {
            errors.push({ message: `Invalid syntax of @public`, entity });
        }

        for (const packageName of exportedFromPackageNames) {
            if (packageNames.has(packageName) || packageName === '@promptbook/boilerplate') {
                continue;
            }

            errors.push({ message: `Exported from non-existing package "${packageName}"`, entity });
        }
    }
}

/**
 * Assigns entities to the packages that export them.
 *
 * @param packagesMetadata - Metadata of all generated packages
 * @param entitiesAnnotations - Parsed entity annotations
 * @param errors - Buffered validation problems
 */
function assignEntitiesToPackages(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    entitiesAnnotations: ReadonlyArray<EntityPackageAnnotationMetadata>,
    errors: Array<PackageMetadataError>,
): void {
    const packageMetadataByName = new Map(
        packagesMetadata.map((packageMetadata) => [packageMetadata.packageFullname, packageMetadata] as const),
    );
    const typePackageMetadata = getRequiredPackageMetadata(packageMetadataByName, '@promptbook/types');

    for (const entityAnnotation of entitiesAnnotations) {
        const { entity, exportedFromPackageNames, isPrivate } = entityAnnotation;
        const isImplicitlyExportedFromTypesPackage = entity.isType && !isPrivate;

        if (isImplicitlyExportedFromTypesPackage) {
            if (exportedFromPackageNames.includes(typePackageMetadata.packageFullname)) {
                errors.push({ message: `You don't need to export because it is exported either way`, entity });
            }

            typePackageMetadata.entities?.push(entity);
        }

        for (const packageName of new Set(exportedFromPackageNames)) {
            if (packageName === typePackageMetadata.packageFullname && isImplicitlyExportedFromTypesPackage) {
                continue;
            }

            const packageMetadata = packageMetadataByName.get(packageName);

            if (!packageMetadata) {
                continue;
            }

            packageMetadata.entities?.push(entity);
        }
    }
}

/**
 * Verifies that each runtime entity is either public, private, or explicitly generated.
 *
 * @param packagesMetadata - Metadata of all generated packages
 * @param entitiesAnnotations - Parsed entity annotations
 * @param errors - Buffered validation problems
 */
function collectEntityVisibilityErrors(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    entitiesAnnotations: ReadonlyArray<EntityPackageAnnotationMetadata>,
    errors: Array<PackageMetadataError>,
): void {
    const exportedEntities = new Set(
        packagesMetadata.flatMap((packageMetadata) => packageMetadata.entities || []).map((entity) => entity),
    );

    for (const entityAnnotation of entitiesAnnotations) {
        const { annotation, entity, isGenerated, isPrivate, isPublic } = entityAnnotation;

        if (shouldSkipEntityVisibilityValidation(entity)) {
            continue;
        }

        if (isPrivate && isPublic) {
            errors.push({ message: `Can't be both @private and @public`, entity });
        } else if (!isPrivate && !isPublic && !isGenerated) {
            errors.push({ message: `Must be @private or @public`, entity });
        } else if (isPublic && !annotation.includes('@promptbook/boilerplate') && !exportedEntities.has(entity)) {
            errors.push({
                message: `Invalid syntax of @public`,
                //         <- Note: "@public" is there BUT not matching any package in previous step
                entity,
            });
        }
    }
}

/**
 * Tells whether an entity is excluded from the runtime visibility requirement checks.
 *
 * @param entity - Project entity to inspect
 * @returns `true` when the entity should be skipped
 */
function shouldSkipEntityVisibilityValidation(entity: EntityMetadata): boolean {
    if (
        entity.isType
        // <- Note: Types are automatically exported from `@promptbook/types` and don't need to be marked as `@public`
    ) {
        return true;
    }

    if (entity.name === 'PROMPTBOOK_ENGINE_VERSION' || entity.name === 'BOOK_LANGUAGE_VERSION') {
        return true;
    }

    if (entity.filename.endsWith('.d.ts')) {
        return true;
    }

    return false;
}

/**
 * Resolves a package metadata record that must exist for the script logic to work.
 *
 * @param packageMetadataByName - Package metadata indexed by full package name
 * @param packageFullname - Required package name
 * @returns Package metadata for the requested package
 */
function getRequiredPackageMetadata(
    packageMetadataByName: ReadonlyMap<string, PackageMetadata>,
    packageFullname: string,
): PackageMetadata {
    const packageMetadata = packageMetadataByName.get(packageFullname);

    if (!packageMetadata) {
        throw new Error(`Missing package metadata for "${packageFullname}"`);
    }

    return packageMetadata;
}

/**
 * Prints buffered metadata problems and fails the script when any were collected.
 *
 * @param errors - Buffered validation problems
 */
function throwPackageMetadataErrorsIfAny(errors: ReadonlyArray<PackageMetadataError>): void {
    if (errors.length === 0) {
        return;
    }

    for (const { message, entity } of errors) {
        const { filename } = entity;
        console.error(
            colors.red(
                spaceTrim(
                    (block) => `
                        ${block(message)}
                        ${filename} -> ${entity.name}
                    `,
                ),
            ),
        );
    }

    throw new Error(
        spaceTrim(
            (block) => `
                ${block(`${errors.length} errors in entities`)}

                ↗ Then commit with message:
                Fix entities \`@public\` and \`@private\` annotations
            
            `,
        ),
    );
}

/** Note: [⚫] Code for repository script [getPackagesMetadata](scripts/generate-packages/getPackagesMetadata.ts) should never be published in any package */
/**
 * TODO: Maybe use here `EntityMetadata.tags` instead of parsing raw annotation
 * TODO: [🧠] Maybe entities checking and matching packages with entities should be done in `findAllProjectEntities`
 * Note: [🧃] Packages `@promptbook/cli` and `@promptbook/types` are marked as dependencies (not devDependencies) to ensure that they are always installed
 */

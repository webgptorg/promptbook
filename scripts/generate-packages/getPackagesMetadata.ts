import colors from 'colors';
import spaceTrim from 'spacetrim';
import { getPackagesMetadataForRollup } from '../../rollup.config';
import { EntityMetadata, findAllProjectEntities } from '../utils/findAllProjectEntities';
import type { PackageMetadata } from './PackageMetadata';

/**
 * Gets metadata of all packages of Promptbook ecosystem
 *
 * There are 2 simmilar functions:
 * - `getPackagesMetadata` Async version with declared types and extended information, use this in scripts
 * - `getPackagesMetadataForRollup` - Sync version with less information, use this ONLY in rollup config
 */
export async function getPackagesMetadata(): Promise<Array<PackageMetadata>> {
    const errors: Array<{ entity: EntityMetadata; message: string }> = [
        /* <- Note: Buffering errors to show all at once */
    ];
    const packagesMetadata = getPackagesMetadataForRollup() as Array<PackageMetadata>;
    const packageNames = packagesMetadata.map((packageMetadata) => packageMetadata.packageFullname);
    const entities = await findAllProjectEntities();

    for (const packageMetadata of packagesMetadata) {
        const { packageFullname } = packageMetadata;
        packageMetadata.entities = [];

        for (const entity of entities) {
            const { anotation, isType } = entity;

            const isPrivate = (anotation || '').includes('@private');
            const isImplicitlyExported = !isPrivate && packageFullname === '@promptbook/types' && isType;

            const publicMatches = (anotation || '').matchAll(
                /@public(?:\s+)exported(?:\s+)from(?:\s+)`(?<packageName>.*?)`/gi,
            );
            const exportedFromPackageNames = Array.from(publicMatches, (match) => match.groups?.packageName).filter(
                (_) => _ !== undefined,
            );

            if ((anotation || '').includes('@public') && exportedFromPackageNames.length === 0) {
                errors.push({ message: `Invalid syntax of @public`, entity });
            }

            for (const packageName of exportedFromPackageNames) {
                if (!packageNames.includes(packageName as string)) {
                    errors.push({ message: `Exported from non-existing package "${packageName}"`, entity });
                }
            }

            const isExplicitlyExported = exportedFromPackageNames.includes(packageFullname);

            if (isImplicitlyExported || isExplicitlyExported) {
                if (isImplicitlyExported && isExplicitlyExported) {
                    errors.push({ message: `You don't need to export because it is exported either way`, entity });
                }

                packageMetadata.entities.push(entity);
            }
        }
    }

    // Note: Check every entity is @public and exported or marked as `@private`
    for (const entity of entities) {
        if (
            entity.isType
            // <- Note: Types are automatically exported from `@promptbook/types` and don't need to be marked as `@public`
        ) {
            continue;
        }

        if (entity.name === 'PROMPTBOOK_ENGINE_VERSION') {
            continue;
        }

        const isPrivate = (entity.anotation || '').includes('@private');
        const isPublic = (entity.anotation || '').includes('@public');

        if (isPrivate && isPublic) {
            errors.push({ message: `Can't be both @private and @public`, entity });
        } else if (!isPrivate && !isPublic) {
            errors.push({ message: `Must be @private or @public`, entity });
        } else if (
            isPublic &&
            !packagesMetadata.some((packageMetadata) => (packageMetadata.entities || []).includes(entity))
        ) {
            errors.push({
                message: `Invalid syntax of @public`,
                //         <- Note: "@public" is thare BUT not matching any package in previous step
                entity,
            });
        }
    }

    if (errors.length > 0) {
        for (const { message, entity } of errors) {
            const { anotation, filename } = entity;
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
        throw new Error(`${errors.length} errors in entities`);
    }

    return packagesMetadata;
}

/**
 * TODO: Maybe use here `EntityMetadata.tags` instead of parsing raw anotation
 * TODO: [🧠] Maybe entities checking and matching packages with entities should be done in `findAllProjectEntities`
 * Note: [🧃] Packages `@promptbook/cli` and `@promptbook/types` are marked as dependencies (not devDependencies) to ensure that they are always installed
 * Note: [⚫] Code in this file should never be published in any package
 */

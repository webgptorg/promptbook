import colors from 'colors';
import { getPackagesMetadataForRollup } from '../../rollup.config';
import { findAllProjectEntities } from '../utils/findAllProjectEntities';
import type { PackageMetadata } from './PackageMetadata';

/**
 * Gets metadata of all packages of Promptbook ecosystem
 *
 * There are 2 simmilar functions:
 * - `getPackagesMetadata` Async version with declared types and extended information, use this in scripts
 * - `getPackagesMetadataForRollup` - Sync version with less information, use this ONLY in rollup config
 */
export async function getPackagesMetadata(): Promise<Array<PackageMetadata>> {
    const packagesMetadata = getPackagesMetadataForRollup() as Array<PackageMetadata>;
    const entities = await findAllProjectEntities();

    for (const packageMetadata of packagesMetadata) {
        const { packageFullname } = packageMetadata;
        packageMetadata.entities = [];

        for (const entity of entities) {
            const { anotation, isType } = entity;

            // TODO: !!!!!!! Every entity MUST be exported or marked as `@private`

            const isImplicitlyExported = packageFullname === '@promptbook/types' && isType;

            const isExplicitlyExported = (anotation || '').includes(
                packageFullname,
            ); /* <- TODO: !!!!!! Better detection of exported status - expect "@public exported from `@promptbook/core`" */

            if (isImplicitlyExported || isExplicitlyExported) {
                if (isImplicitlyExported && isExplicitlyExported) {
                    console.warn(
                        colors.yellow(
                            `You don't need to export entity "${entity.name}" explicitly because it is exported either way`,
                        ),
                    );
                }

                packageMetadata.entities.push(entity);
            }
        }
    }

    return packagesMetadata;
}

/**
 * Note: [🧃] Packages `@promptbook/cli` and `@promptbook/types` are marked as dependencies (not devDependencies) to ensure that they are always installed
 */

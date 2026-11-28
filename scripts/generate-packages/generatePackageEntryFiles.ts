import colors from 'colors';
import { writeFile } from 'fs/promises';
import { dirname, relative } from 'path';
import { spaceTrim } from 'spacetrim';
import { GENERATOR_WARNING } from '../../src/config';
import type { PackageMetadata } from './PackageMetadata';
import { logPackageGenerationStep } from './logPackageGenerationStep';

/**
 * Generates the aggregate entry file for every package that publishes one.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @private function of generatePackages
 */
export async function generatePackageEntryFiles(packagesMetadata: ReadonlyArray<PackageMetadata>): Promise<void> {
    logPackageGenerationStep(`1️⃣  Generate entry file for each package`);

    for (const packageMetadata of packagesMetadata) {
        await generatePackageEntryFile(packageMetadata);
    }
}

/**
 * Generates the aggregate entry file for a single package.
 *
 * @param packageMetadata - Metadata of the generated package
 * @private internal utility of generatePackageEntryFiles
 */
async function generatePackageEntryFile(packageMetadata: PackageMetadata): Promise<void> {
    const { entryIndexFilePath, entities, packageFullname } = packageMetadata;

    if (entryIndexFilePath === null) {
        return;
    }

    if (entities === undefined) {
        throw new Error(`Entities are not defined for ${packageMetadata.packageFullname}`);
    }

    const entryIndexFilePathContent = `${createPackageEntryFileContent(entryIndexFilePath, packageFullname, entities)}\n`;

    // TODO: `entryIndexFilePathContent = await prettifyTypeScript(entryIndexFilePathContent)`

    await writeFile(entryIndexFilePath, entryIndexFilePathContent, 'utf-8');
    console.info(colors.green('Generated index file ' + entryIndexFilePath.split('\\').join('/')));
}

/**
 * Renders the generated entry file content for one package.
 *
 * @param entryIndexFilePath - Generated index file path
 * @param packageFullname - Full package name
 * @param entities - Exported entities for the package
 * @returns TypeScript source for the entry file
 * @private internal utility of generatePackageEntryFiles
 */
function createPackageEntryFileContent(
    entryIndexFilePath: string,
    packageFullname: string,
    entities: NonNullable<PackageMetadata['entities']>,
): string {
    const entryIndexFilePathContentImports: Array<string> = [];
    const entryIndexFilePathContentExports: Array<string> = [];

    for (const entity of entities) {
        const { filename, name } = entity;
        const isType = shouldExportEntityAsType(packageFullname, entity.isType);
        const importPath = resolveEntryImportPath(entryIndexFilePath, filename);
        const typePrefix = isType ? ' type' : '';

        entryIndexFilePathContentImports.push(`import${typePrefix} { ${name} } from '${importPath}';`);
        entryIndexFilePathContentExports.push(`export${typePrefix} { ${name} };`);
    }

    if (packageFullname === '@promptbook/types') {
        return spaceTrim(
            (block) => `
                // ${block(GENERATOR_WARNING)}
                // \`${packageFullname}\`

                ${block(entryIndexFilePathContentImports.join('\n'))}

                // Note: Entities of the \`${packageFullname}\`
                ${block(entryIndexFilePathContentExports.join('\n'))}
            `,
        );
    }

    const useClientDirective = packageFullname === '@promptbook/components' ? "'use client';" : '';

    return spaceTrim(
        (block) => `
            ${useClientDirective}

            // ${block(
                GENERATOR_WARNING /* <- TODO: !!!! Make function getGeneratorWarning and always pass the generator file + instructions for AI */,
            )}
            // \`${packageFullname}\`

            import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
            ${block(entryIndexFilePathContentImports.join('\n'))}


            // Note: Exporting version from each package
            export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };


            // Note: Entities of the \`${packageFullname}\`
            ${block(entryIndexFilePathContentExports.join('\n'))}
        `,
    );
}

/**
 * Determines whether an exported entity should use type-only syntax in generated package entrypoints.
 *
 * @param packageFullname - Full package name
 * @param isType - Whether the entity itself is typed as a type-only export
 * @returns Whether the entity should be imported and exported as a type
 * @private internal utility of generatePackageEntryFiles
 */
function shouldExportEntityAsType(packageFullname: string, isType: boolean): boolean {
    if (packageFullname === '@promptbook/types') {
        return true;
    }

    return isType;
}

/**
 * Resolves the relative import path from a generated entry file to the source entity.
 *
 * @param entryIndexFilePath - Generated index file path
 * @param filename - Source entity file path
 * @returns Normalized import path without a file extension
 * @private internal utility of generatePackageEntryFiles
 */
function resolveEntryImportPath(entryIndexFilePath: string, filename: string): string {
    let importPath = `${relative(dirname(entryIndexFilePath), filename).split('\\').join('/')}`;

    if (!importPath.startsWith('.')) {
        importPath = './' + importPath;
    }

    if (importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
        importPath = importPath.replace(/\.(ts|tsx)$/, '');
    }

    return importPath;
}

// Note: [⚫] Code for repository script [generatePackageEntryFiles](scripts/generate-packages/generatePackageEntryFiles.ts) should never be published in any package

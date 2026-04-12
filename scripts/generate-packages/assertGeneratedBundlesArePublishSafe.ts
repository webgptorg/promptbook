import colors from 'colors';
import { readFile } from 'fs/promises';
import glob from 'glob-promise'; // <- TODO: [🚰] Use just 'glob'
import { spaceTrim } from 'spacetrim';
import type { PackageMetadata } from './PackageMetadata';
import { logPackageGenerationStep } from './logPackageGenerationStep';

/**
 * Packages that are allowed to contain code marked as Node-only.
 *
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
const NODE_ONLY_PACKAGE_FULLNAMES = new Set([
    '@promptbook/node',
    '@promptbook/cli',
    '@promptbook/wizard',
    '@promptbook/remote-server',
    '@promptbook/documents',
    '@promptbook/legacy-documents',
    '@promptbook/website-crawler',
    '@promptbook/markitdown',
    '@promptbook/pdf',
]);

/**
 * Packages that are allowed to contain code marked as browser-only.
 *
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
const BROWSER_ONLY_PACKAGE_FULLNAMES = new Set(['@promptbook/browser', '@promptbook/components']);

/**
 * Verifies that generated bundle contents do not leak non-publishable code markers.
 *
 * @param packagesMetadata - Metadata of generated packages
 * @param isBundlerSkipped - Whether bundling is disabled for this run
 * @private function of generatePackages
 */
export async function assertGeneratedBundlesArePublishSafe(
    packagesMetadata: ReadonlyArray<PackageMetadata>,
    isBundlerSkipped: boolean,
): Promise<void> {
    logPackageGenerationStep(`6️⃣  Test that nothing what should not be published is published`);

    if (isBundlerSkipped) {
        console.info(colors.yellow(`Skipping the bundler, skipping the tests for bundle content`));
        return;
    }

    for (const packageMetadata of packagesMetadata) {
        await assertPackageBundleIsPublishSafe(packageMetadata);
    }
}

/**
 * Validates all emitted files for one generated package.
 *
 * @param packageMetadata - Metadata of the generated package
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
async function assertPackageBundleIsPublishSafe(packageMetadata: PackageMetadata): Promise<void> {
    const { packageBasename, packageFullname } = packageMetadata;
    const bundleFileNames = await glob(`./packages/${packageBasename}/**/*`, { nodir: true });

    for (const bundleFileName of bundleFileNames) {
        if (shouldSkipBundleContentCheck(bundleFileName)) {
            continue;
        }

        const bundleFileContent = await readFile(bundleFileName, 'utf-8');

        assertBundleFileDoesNotContainNeverPublishMarker(bundleFileName, bundleFileContent);
        assertBundleFileDoesNotContainReleasedPackageMarker(bundleFileName, bundleFileContent);
        assertBundleFileDoesNotContainCliOnlyMarkerOutsideCli(packageFullname, bundleFileName, bundleFileContent);
        assertBundleFileDoesNotContainNodeOnlyMarkerOutsideNodePackages(
            packageFullname,
            bundleFileName,
            bundleFileContent,
        );
        assertBundleFileDoesNotContainBrowserOnlyMarkerOutsideBrowserPackages(
            packageFullname,
            bundleFileName,
            bundleFileContent,
        );
    }
}

/**
 * Determines whether a generated file should be excluded from marker scanning.
 *
 * @param bundleFileName - Generated bundle file path
 * @returns Whether the file should be skipped
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function shouldSkipBundleContentCheck(bundleFileName: string): boolean {
    return bundleFileName.includes('/typings/') || bundleFileName.endsWith('.d.ts');
    // <- TODO: Maybe exclude "typings" directly in glob
}

/**
 * Finds the first occurrence of a marker in file content and returns formatted line information.
 *
 * @param fileContent - The content of the file to search
 * @param marker - The marker to search for (e.g. `[🟢]`, `[⚪]`)
 * @returns Formatted string with line number and content, or empty string if marker is not found
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function findMarkerLine(fileContent: string, marker: string): string {
    const lines = fileContent.split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        if (lines[lineIndex].includes(marker)) {
            const lineNumber = lineIndex + 1;
            const lineContent = lines[lineIndex].trim();

            return spaceTrim(`

                In line ${lineNumber}:
                ${lineContent}
            `);
        }
    }

    return '';
}

/**
 * Ensures a generated bundle file does not contain the repository-private marker.
 *
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function assertBundleFileDoesNotContainNeverPublishMarker(bundleFileName: string, bundleFileContent: string): void {
    if (!bundleFileContent.includes('[⚫]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [⚫] should never be never released in the bundle

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[⚫]'))}
            `,
        ),
    );
}

/**
 * Ensures a generated bundle file does not contain the released-package marker.
 *
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function assertBundleFileDoesNotContainReleasedPackageMarker(bundleFileName: string, bundleFileContent: string): void {
    if (!bundleFileContent.includes('[⚪]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [⚪] should never be in a released package.

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[⚪]'))}
            `,
        ),
    );
}

/**
 * Ensures CLI-only code markers never leak into non-CLI packages.
 *
 * @param packageFullname - Full package name
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function assertBundleFileDoesNotContainCliOnlyMarkerOutsideCli(
    packageFullname: string,
    bundleFileName: string,
    bundleFileContent: string,
): void {
    if (packageFullname === '@promptbook/cli' || !bundleFileContent.includes('[🟡]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [🟡] should never be never released out of @promptbook/cli

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[🟡]'))}
            `,
        ),
    );
}

/**
 * Ensures Node-only code markers never leak into packages that can run in browser-like environments.
 *
 * @param packageFullname - Full package name
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function assertBundleFileDoesNotContainNodeOnlyMarkerOutsideNodePackages(
    packageFullname: string,
    bundleFileName: string,
    bundleFileContent: string,
): void {
    if (NODE_ONLY_PACKAGE_FULLNAMES.has(packageFullname) || !bundleFileContent.includes('[🟢]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [🟢] should never be never released in packages that could be imported into browser environment

                But found in package \`${packageFullname}\`

                Analyze the issue in the bundle file:
                ${block(bundleFileName)}
                <- Search for [🟢] marker
                ${block(findMarkerLine(bundleFileContent, '[🟢]'))}
            `,
        ),
    );
}

/**
 * Ensures browser-only code markers never leak into non-browser packages.
 *
 * @param packageFullname - Full package name
 * @param bundleFileName - Generated bundle file path
 * @param bundleFileContent - Generated bundle file content
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function assertBundleFileDoesNotContainBrowserOnlyMarkerOutsideBrowserPackages(
    packageFullname: string,
    bundleFileName: string,
    bundleFileContent: string,
): void {
    if (BROWSER_ONLY_PACKAGE_FULLNAMES.has(packageFullname) || !bundleFileContent.includes('[🔵]')) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [🔵] should never be never released out of @promptbook/browser

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[🔵]'))}
            `,
        ),
    );
}

// Note: [⚫] Code for repository script [assertGeneratedBundlesArePublishSafe](scripts/generate-packages/assertGeneratedBundlesArePublishSafe.ts) should never be published in any package

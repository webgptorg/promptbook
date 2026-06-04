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
 * Browser-only helpers intentionally included in the CLI package only for the embedded Next client runtime.
 *
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
const CLI_AGENTS_SERVER_BROWSER_RUNTIME_FILE_NAMES = new Set([
    'packages/cli/src/speech-recognition/BrowserSpeechRecognition.ts',
    'packages/cli/src/utils/files/$induceBookDownload.ts',
    'packages/cli/src/utils/files/$induceFileDownload.ts',
    'packages/cli/src/utils/files/ObjectUrl.ts',
]);

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
    logPackageGenerationStep(`8️⃣  Test that nothing what should not be published is published`);

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
 * Normalizes generated package paths so marker exceptions are stable across platforms.
 *
 * @param bundleFileName - Generated bundle file path
 * @returns Normalized file path with POSIX separators and no leading `./`
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function normalizeBundleFileName(bundleFileName: string): string {
    return bundleFileName.replace(/\\/gu, '/').replace(/^\.\//u, '');
}

/**
 * Checks whether a browser-only marker belongs to the embedded Agents Server browser runtime.
 *
 * @param packageFullname - Full package name
 * @param bundleFileName - Generated bundle file path
 * @returns Whether the browser-only marker is allowed at this path
 * @private internal utility of assertGeneratedBundlesArePublishSafe
 */
function isBrowserOnlyMarkerAllowedInCliAgentsServerRuntime(
    packageFullname: string,
    bundleFileName: string,
): boolean {
    if (packageFullname !== '@promptbook/cli') {
        return false;
    }

    return CLI_AGENTS_SERVER_BROWSER_RUNTIME_FILE_NAMES.has(normalizeBundleFileName(bundleFileName));
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
        const line = lines[lineIndex];

        if (line?.includes(marker)) {
            const lineNumber = lineIndex + 1;
            const lineContent = line.trim();

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
                Things marked with [⚫] should never be released in any bundle

                **Steps to fix the issue:**

                1) Look why the marker [⚫] is released in the bundle to NPM
                2) Analyze the import chain which leads to usage in the released bundle
                3) Fix the issue:
                    A) If the code is indeed not meant to be published, fix the consuming code
                    B) If the code is accidentally marked as non-publishable, remove the [⚫] marker from the source code

                Note: Purpose of this mechanism is to prevent accidental leaks of code that is not meant to be published in NPM packages.
                This can include code that is only meant for internal use within the repository, code that is meant to run only in development environments, or any other code that should not be part of the public API of the packages.

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
                Things marked with [🟡] should never be released out of @promptbook/cli

                **Steps to fix the issue:**

                1) Look why the marker [🟡] is in the released \`@promptbook/cli\` bundle
                2) Analyze the import chain which leads to usage outside of the CLI package
                3) Fix the issue:
                    A) If the code is indeed CLI-only, fix the consuming code
                    B) If the code has some CLI-only parts but is not fully CLI-only, consider splitting it into separate files and marking only the truly CLI-only code with [🟡]
                    C) If the code is accidentally marked as CLI-only, remove the [🟡] marker from the source code

                Note: Purpose of this mechanism is to prevent accidental leaks of CLI-only code into packages that could be imported into another environments
                For example, if we accidentally import terminal calling into a package that is not marked as CLI-only, it could cause runtime errors or security issues
                There are equivalent checks for Node-only and Browser-only code leaking

                **Regardless of the specific fix, make sure to:**

                -   Keep in mind the DRY _(don't repeat yourself)_ principle.
                -   Do a proper analysis of the current functionality before you start refactoring and fixing the issue.
                -   Add the changes into the [changelog](changelog/_current-preversion.md)

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
                Things marked with [🟢] should never be never released outside node environment

                But found in package \`${packageFullname}\`

                **Steps to fix the issue:**

                1) Look why the marker [🟢] is in the released into the bundle that can end up in the browser
                2) Analyze the import chain which leads to usage outside of the non-node package
                3) Fix the issue:
                    A) If the code is indeed node-only, fix the consuming code
                    B) If the code has some node-only parts but is not fully node-only, consider splitting it into separate files and marking only the truly node-only code with [🟢]
                    C) If the code is accidentally marked as node-only, remove the [🟢] marker from the source code

                Note: Purpose of this mechanism is to prevent accidental leaks of node-only code into packages that could be imported into browser environments
                For example, if we accidentally import \`process\` into a package that is not marked as node-only, it could cause runtime errors when someone tries to use that package in a browser environment
                There are equivalent checks for browser-only code leaking into node-importable packages

                **Regardless of the specific fix, make sure to:**

                -   Keep in mind the DRY _(don't repeat yourself)_ principle.
                -   Do a proper analysis of the current functionality before you start refactoring and fixing the issue.
                -   Add the changes into the [changelog](changelog/_current-preversion.md)

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
    if (
        BROWSER_ONLY_PACKAGE_FULLNAMES.has(packageFullname) ||
        isBrowserOnlyMarkerAllowedInCliAgentsServerRuntime(packageFullname, bundleFileName) ||
        !bundleFileContent.includes('[🔵]')
    ) {
        return;
    }

    throw new Error(
        spaceTrim(
            (block) => `
                Things marked with [🔵] should never be never released out of @promptbook/browser

                **Steps to fix the issue:**

                1) Look why the marker [🔵] is in the released \`@promptbook/browser\` bundle
                2) Analyze the import chain which leads to usage outside of the browser package
                3) Fix the issue:
                    A) If the code is indeed browser-only, fix the consuming code
                    B) If the code has some browser-only parts but is not fully browser-only, consider splitting it into separate files and marking only the truly browser-only code with [🔵]
                    C) If the code is accidentally marked as browser-only, remove the [🔵] marker from the source code

                Note: Purpose of this mechanism is to prevent accidental leaks of browser-only code into packages that could be imported into Node environments
                For example, if we accidentally import \`window\` into a package that is not marked as browser-only, it could cause runtime errors when someone tries to use that package in Node environment
                There are equivalent checks for Node-only code leaking into browser-importable packages

                **Regardless of the specific fix, make sure to:**

                -   Keep in mind the DRY _(don't repeat yourself)_ principle.
                -   Do a proper analysis of the current functionality before you start refactoring and fixing the issue.
                -   Add the changes into the [changelog](changelog/_current-preversion.md)

                ${bundleFileName}
                ${block(findMarkerLine(bundleFileContent, '[🔵]'))}
            `,
        ),
    );
}

// Note: [⚫] Code for repository script [assertGeneratedBundlesArePublishSafe](scripts/generate-packages/assertGeneratedBundlesArePublishSafe.ts) should never be published in any package

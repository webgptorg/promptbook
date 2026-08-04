/**
 * Packages which are published only for Node.js runtimes and can never be imported into a browser environment.
 *
 * @private internal utility of isNodeOnlyPackage
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
 * Tells whether one generated package is published only for Node.js runtimes.
 *
 * Such a package is allowed to contain code marked as Node-only and its dependencies never need to be resolvable
 * by a browser bundler.
 *
 * @param packageFullname - Full package name, for example `@promptbook/node`
 * @returns Whether the package is published only for Node.js runtimes
 * @private function of generatePackages
 */
export function isNodeOnlyPackage(packageFullname: string): boolean {
    return NODE_ONLY_PACKAGE_FULLNAMES.has(packageFullname);
}

// Note: [⚫] Code for repository script [isNodeOnlyPackage](scripts/generate-packages/isNodeOnlyPackage.ts) should never be published in any package

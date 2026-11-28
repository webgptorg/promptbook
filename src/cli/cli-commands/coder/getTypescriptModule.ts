/**
 * Possible runtime shapes returned when importing the `typescript` package.
 */
type ImportedTypescriptModule = typeof import('typescript') | { default: typeof import('typescript') };

/**
 * Loads the TypeScript runtime used for parsing JSONC-style project files.
 *
 * @private internal utility of `coder init`
 */
export async function getTypescriptModule(): Promise<typeof import('typescript')> {
    return normalizeImportedTypescriptModule((await import('typescript')) as ImportedTypescriptModule);
}

/**
 * Normalizes CommonJS-via-`default` and direct namespace imports of TypeScript.
 *
 * @private internal utility of `getTypescriptModule`
 */
export function normalizeImportedTypescriptModule(
    importedTypescriptModule: ImportedTypescriptModule,
): typeof import('typescript') {
    return 'parseConfigFileTextToJson' in importedTypescriptModule
        ? importedTypescriptModule
        : importedTypescriptModule.default;
}

// Note: [🟡] Code for coder init TypeScript loading [getTypescriptModule](src/cli/cli-commands/coder/getTypescriptModule.ts) should never be published outside of `@promptbook/cli`

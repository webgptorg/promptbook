/**
 * Imports a runtime-only module without letting Next.js statically bundle Node-only dependencies.
 *
 * @param specifier - Module specifier to import at runtime.
 * @returns Imported module namespace.
 * @private internal helper for runtime-only database utilities
 */
export async function importRuntimeModule<TModule>(specifier: string): Promise<TModule> {
    return (await Function('specifier', 'return import(specifier)')(specifier)) as TModule;
}

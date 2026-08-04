/**
 * Creates a loader which imports one module on the first call and reuses the very same module afterwards
 *
 * Note: [🐌] Heavy third-party dependencies are imported lazily to keep the startup of the Promptbook CLI fast.
 *       A statically imported dependency is loaded every single time the bundle is loaded, even when the running
 *       command never touches it. A lazily imported dependency is loaded only when the feature is really used.
 *
 * @example
 * const loadJsdomModule = createLazyModuleLoader(() => import('jsdom'));
 * const { JSDOM } = await loadJsdomModule();
 *
 * @private internal utility of Promptbook
 */
export function createLazyModuleLoader<TModule>(importModule: () => Promise<TModule>): () => Promise<TModule> {
    let importedModulePromise: Promise<TModule> | null = null;

    return function loadModule(): Promise<TModule> {
        if (importedModulePromise === null) {
            importedModulePromise = importModule();
        }

        return importedModulePromise;
    };
}

// Note: [🐌] Do not convert the lazy `import(...)` calls back to static `import` statements, it would bring back the
//       slow startup of the `ptbk` CLI utility

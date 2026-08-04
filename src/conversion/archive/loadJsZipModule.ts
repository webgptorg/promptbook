import { createLazyModuleLoader } from '../../utils/misc/createLazyModuleLoader';

/**
 * Loads the ZIP archive library (`jszip`) on demand
 *
 * Note: [🐌] Loaded lazily to keep the startup of the `ptbk` CLI utility fast
 *
 * @private internal utility of `loadArchive` and `saveArchive`
 */
export const loadJsZipModule = createLazyModuleLoader(() => import('jszip'));

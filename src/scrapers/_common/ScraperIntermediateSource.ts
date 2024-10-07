import type { IDestroyable } from 'destroyable';
import { string_absolute_filename } from '../../types/typeAliases';

/**
 * @@@
 */
export type ScraperIntermediateSource = IDestroyable & {
    /**
     * @@@
     */
    readonly filename: string_absolute_filename;
};

/**
 * Shared textarea styles for custom resource editors.
 *
 * @private
 */
export const CUSTOM_RESOURCE_INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/40';

/**
 * Shared primary action button styles for custom-resource admin panels.
 *
 * @private
 */
export const CUSTOM_RESOURCE_PRIMARY_BUTTON_CLASS_NAME =
    'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-300';

/**
 * Shared secondary action button styles for custom-resource admin panels.
 *
 * @private
 */
export const CUSTOM_RESOURCE_SECONDARY_BUTTON_CLASS_NAME =
    'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

/**
 * Reads JSON body from a fetch response with a typed fallback.
 *
 * @private
 */
export async function readJsonResponse<T>(response: Response): Promise<T> {
    return (await response.json()) as T;
}

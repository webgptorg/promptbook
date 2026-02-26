/**
 * Shared textarea styles for custom resource editors.
 * @private
 */
export const CUSTOM_RESOURCE_INPUT_CLASS_NAME =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Reads JSON body from a fetch response with a typed fallback.
 * @private
 */
export async function readJsonResponse<T>(response: Response): Promise<T> {
    return (await response.json()) as T;
}

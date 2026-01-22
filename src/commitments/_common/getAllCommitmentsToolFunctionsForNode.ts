import { ToolFunction } from '../../_packages/types.index';
import { $isRunningInNode, spaceTrim } from '../../_packages/utils.index';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { string_javascript_name } from '../../types/typeAliases';
import { fetchUrlContent } from '../USE_BROWSER/fetchUrlContent';
import { getAllCommitmentsToolFunctionsForBrowser } from './getAllCommitmentsToolFunctionsForBrowser';

/**
 * Gets all function implementations provided by all commitments
 *
 * Note: This function is intended for server use, there is also equivalent `getAllCommitmentsToolFunctionsForBrowser` for browser use
 *
 * @public exported from `@promptbook/node`
 */

export function getAllCommitmentsToolFunctionsForNode(): Record<string_javascript_name, ToolFunction> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Function getAllCommitmentsToolFunctionsForNode should be run in Node.js environment.

                - In browser use getAllCommitmentsToolFunctionsForBrowser instead.
                - This function can include server-only tools which cannot run in browser environment.

            `),
        );
    }

    const allToolFunctionsInBrowser: Record<string_javascript_name, ToolFunction> =
        getAllCommitmentsToolFunctionsForBrowser();

    const allToolFunctionsInNode: Record<string_javascript_name, ToolFunction> = {
        /**
         * @@@
         *
         * Note: [🛺] This function has implementation both for browser and node, this is the full one for node
         */
        async fetch_url_content(args: { url: string }): Promise<string> {
            console.log('!!!! [Tool] fetch_url_content called', { args });

            const { url } = args;

            return await fetchUrlContent(url);
        },

        // TODO: !!!! Unhardcode, make proper server function register from definitions
    };

    return { ...allToolFunctionsInBrowser, ...allToolFunctionsInNode };
}

/**
 * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [🏓] Unite `xxxForServer` and `xxxForNode` naming
 */

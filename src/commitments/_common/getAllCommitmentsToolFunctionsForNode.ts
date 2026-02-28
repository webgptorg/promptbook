import { $isRunningInNode, spaceTrim } from '../../_packages/utils.index';
import { EnvironmentMismatchError } from '../../errors/EnvironmentMismatchError';
import { fetchUrlContent } from '../USE_BROWSER/fetchUrlContent';
import { resolveRunBrowserToolForNode } from '../USE_BROWSER/resolveRunBrowserToolForNode';
import { resolveSendEmailToolForNode } from '../USE_EMAIL/resolveSendEmailToolForNode';
import {
    collectCommitmentToolFunctions,
    createToolFunctionsProxy,
    type CommitmentToolFunctions,
} from './commitmentToolFunctions';

const nodeToolFunctions: CommitmentToolFunctions = {
    /**
     * @@@
     *
     * Note: [??] This function has implementation both for browser and node, this is the full one for node
     */
    async fetch_url_content(args: { url: string }): Promise<string> {
        console.log('!!!! [Tool] fetch_url_content called', { args });

        const { url } = args;

        return await fetchUrlContent(url);
    },

    /**
     * @@@
     *
     * Note: [??] This function has implementation both for browser and node, this is the server one for node
     */
    run_browser: resolveRunBrowserToolForNode(),

    /**
     * @@@
     *
     * Note: [??] This function has implementation both for browser and node, this is the server one for node
     */
    send_email: resolveSendEmailToolForNode(),

    // TODO: !!!! Unhardcode, make proper server function register from definitions
};

const nodeToolFunctionsProxy = createToolFunctionsProxy(() => ({
    ...collectCommitmentToolFunctions(),
    ...nodeToolFunctions,
}));

/**
 * Gets all function implementations provided by all commitments
 *
 * Note: This function is intended for server use, there is also equivalent `getAllCommitmentsToolFunctionsForBrowser` for browser use
 *
 * @public exported from `@promptbook/node`
 */
export function getAllCommitmentsToolFunctionsForNode(): CommitmentToolFunctions {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Function getAllCommitmentsToolFunctionsForNode should be run in Node.js environment.

                - In browser use getAllCommitmentsToolFunctionsForBrowser instead.
                - This function can include server-only tools which cannot run in browser environment.

            `),
        );
    }

    return nodeToolFunctionsProxy;
}

/**
 * Note: [??] Code in this file should never be never released in packages that could be imported into browser environment
 * TODO: [??] Unite `xxxForServer` and `xxxForNode` naming
 */

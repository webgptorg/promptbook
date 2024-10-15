import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';
import { string_mime_type } from '../../../types/typeAliases';
import { $isRunningInNode } from '../../../utils/environment/$isRunningInNode';
import { Scraper } from '../Scraper';

type GetScrapersForNodeOptions = {
    /**
     * @@@
     */
    mimeType?: string_mime_type;
};

/**
 * Returns LLM tools for CLI
 *
 * @private within the repository - for CLI utils
 */
export async function $getScrapersForNode(options?: GetScrapersForNodeOptions): Promise<Array<Scraper>> {
    if (!$isRunningInNode()) {
        throw new EnvironmentMismatchError('Function `$getScrapersForNode` works only in Node.js environment');
    }

    const { mimeType = false } = options ?? {};

    return [];
}

/**
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */

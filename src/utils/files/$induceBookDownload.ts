import { parseAgentSource } from '../../_packages/core.index';
import { string_book } from '../../_packages/types.index';
import { $isRunningInBrowser } from '../environment/$isRunningInBrowser';
import { titleToName } from '../normalization/titleToName';
import { $side_effect } from '../organization/$side_effect';
import { $induceFileDownload } from './$induceFileDownload';

/**
 * Download a Book in a browser
 *
 * Note: `$` is used to indicate that this function is not a pure function - its purpose is to cause a side effect (download a file)
 *
 * @public exported from `@promptbook/browser`
 */
export async function $induceBookDownload(book: string_book): Promise<$side_effect> {
    if (!$isRunningInBrowser()) {
        throw new Error('Function `$induceBookDownload` is available ONLY in browser');
    }

    const { agentName } = parseAgentSource(book);
    const bookFile = new File([book], `${titleToName(agentName || 'AI Avatar')}.book`, {
        type: 'application/json',
    });

    return /* not await */ $induceFileDownload(bookFile);
}

/**
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */

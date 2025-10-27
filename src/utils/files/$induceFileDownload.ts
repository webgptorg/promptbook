import { string_url } from '../../types/typeAliases';
// import { $isRunningInBrowser } from '../environment/$isRunningInBrowser';
import { $side_effect } from '../organization/$side_effect';
import { TODO_USE } from '../organization/TODO_USE';
// import { ObjectUrl } from './ObjectUrl';

/**
 * Download a File in a browser
 *
 * Note: `$` is used to indicate that this function is not a pure function - its purpose is to cause a side effect (download a file)
 *
 * @public exported from `@promptbook/browser`
 */
export async function $induceFileDownload(fileOrBlobOrUrl: File | Blob | URL | string_url): Promise<$side_effect> {
    TODO_USE(fileOrBlobOrUrl);

    /*
    TODO: !!!! Is this fixing Vercel deployment issue ??? !!!!


    if (!$isRunningInBrowser()) {
        throw new Error('Function `$induceFileDownload` is available ONLY in browser');
    }

    const objectUrl = ObjectUrl.fromBlobOrUrl(fileOrBlobOrUrl);
    const link = window.document.createElement('a');
    link.href = objectUrl.href;
    link.download = (fileOrBlobOrUrl as File).name || 'untitled' /* <- TODO: Add proper extension according to url * /;
    link.click();
    await objectUrl.destroy();
    */
}

/**
 * Note: [🔵] Code in this file should never be published outside of `@promptbook/browser`
 */

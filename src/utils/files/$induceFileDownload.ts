import { string_url } from '../../types/typeAliases';
import { $isRunningInBrowser } from '../environment/$isRunningInBrowser';
import { ObjectUrl } from './ObjectUrl';

/**
 * Download a File to with a browser
 *
 * @public exported from `@promptbook/browser`
 */
export async function $induceFileDownload(fileOrBlobOrUrl: File | Blob | URL | string_url) {
    if (!$isRunningInBrowser()) {
        throw new Error('Function `induceFileDownload` is available ONLY in browser');
    }

    const objectUrl = ObjectUrl.fromBlobOrUrl(fileOrBlobOrUrl);
    const link = window.document.createElement('a');
    link.href = objectUrl.href;
    link.download = (fileOrBlobOrUrl as File).name || 'untitled' /* <- TODO: Add proper extension according to url */;
    link.click();
    await objectUrl.destroy();
}

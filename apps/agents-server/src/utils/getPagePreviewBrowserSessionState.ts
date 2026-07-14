import type { PagePreviewSessionState } from '../../../../src/book-components/Chat/Chat/pagePreview/PagePreviewSessionState';
import type { PagePreviewBrowserSession } from './pagePreviewBrowserSessions';

/**
 * Reads the current navigation state of one live browser preview session.
 *
 * `canGoBack` / `canGoForward` are resolved from the CDP navigation history when the stream
 * runs on a CDP screencast; otherwise they stay `null` and the preview toolbar keeps its
 * history buttons enabled.
 *
 * @param session - Active browser preview session.
 * @returns Session navigation state, or `null` when the session has no usable page.
 *
 * @private internal utility of Agents Server page-preview streaming
 */
export async function getPagePreviewBrowserSessionState(
    session: PagePreviewBrowserSession,
): Promise<PagePreviewSessionState | null> {
    const page = session.page;
    if (!page || page.isClosed()) {
        return null;
    }

    const url = page.url();
    const title = await page.title().catch(() => null);

    let canGoBack: boolean | null = null;
    let canGoForward: boolean | null = null;

    if (session.cdpSession) {
        try {
            const navigationHistory = await session.cdpSession.send('Page.getNavigationHistory');
            canGoBack = navigationHistory.currentIndex > 0;
            canGoForward = navigationHistory.currentIndex < navigationHistory.entries.length - 1;
        } catch {
            // The CDP session may already be detached — the toolbar keeps its buttons enabled
        }
    }

    return { url, title, canGoBack, canGoForward };
}

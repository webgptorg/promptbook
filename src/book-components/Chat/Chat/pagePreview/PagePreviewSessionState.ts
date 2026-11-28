/**
 * Navigation state of one live page-preview browser session, shown in the preview toolbar.
 *
 * `canGoBack` / `canGoForward` are `null` when the server cannot inspect the remote history
 * (for example when the CDP session is unavailable) — the toolbar keeps its buttons enabled then.
 *
 * @private type shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export type PagePreviewSessionState = {
    readonly url: string;
    readonly title: string | null;
    readonly canGoBack: boolean | null;
    readonly canGoForward: boolean | null;
};

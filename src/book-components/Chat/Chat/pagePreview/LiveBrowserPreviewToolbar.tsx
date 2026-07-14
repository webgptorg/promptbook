'use client';

import type { FormEvent } from 'react';
import { classNames } from '../../../_common/react-utils/classNames';
import styles from '../Chat.module.css';
import type { PagePreviewNavigationAction } from './PagePreviewInputEvent';

/**
 * Props of the live browser preview toolbar.
 *
 * @private component of `<LiveBrowserPreview/>`
 */
export type LiveBrowserPreviewToolbarProps = {
    /**
     * URL shown in the address input (either the user's draft or the remote page URL).
     */
    readonly displayedUrl: string;

    /**
     * URL of the remote page used by the "Open in new tab" link.
     */
    readonly externalUrl: string;

    /**
     * Whether the remote browser can navigate back, `null` when unknown.
     */
    readonly canGoBack: boolean | null;

    /**
     * Whether the remote browser can navigate forward, `null` when unknown.
     */
    readonly canGoForward: boolean | null;

    /**
     * Current local zoom level (`1` = 100%).
     */
    readonly zoomLevel: number;

    /**
     * Whether the preview is currently in full screen mode.
     */
    readonly isFullscreen: boolean;

    /**
     * Sends one history navigation to the remote browser.
     */
    readonly onNavigate: (action: PagePreviewNavigationAction) => void;

    /**
     * Updates the address-input draft, `null` restores the live remote URL.
     */
    readonly onUrlDraftChange: (draft: string | null) => void;

    /**
     * Navigates the remote browser to the submitted address.
     */
    readonly onUrlSubmit: (url: string) => void;

    /**
     * Zooms the local preview in.
     */
    readonly onZoomIn: () => void;

    /**
     * Zooms the local preview out.
     */
    readonly onZoomOut: () => void;

    /**
     * Resets the local preview zoom to 100%.
     */
    readonly onZoomReset: () => void;

    /**
     * Toggles the full screen mode of the preview.
     */
    readonly onToggleFullscreen: () => void;
};

/**
 * Browser-like toolbar of the live page preview with history navigation, an editable
 * address bar, local zoom controls, full screen toggle, and an "Open in new tab" link.
 *
 * @private component of `<LiveBrowserPreview/>`
 */
export function LiveBrowserPreviewToolbar(props: LiveBrowserPreviewToolbarProps) {
    const {
        displayedUrl,
        externalUrl,
        canGoBack,
        canGoForward,
        zoomLevel,
        isFullscreen,
        onNavigate,
        onUrlDraftChange,
        onUrlSubmit,
        onZoomIn,
        onZoomOut,
        onZoomReset,
        onToggleFullscreen,
    } = props;

    const handleUrlSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onUrlSubmit(displayedUrl);
        (document.activeElement as HTMLElement | null)?.blur?.();
    };

    return (
        <div className={styles.liveBrowserPreviewToolbar}>
            <button
                type="button"
                className={styles.liveBrowserPreviewToolbarButton}
                onClick={() => onNavigate('back')}
                disabled={canGoBack === false}
                title="Go back"
                aria-label="Go back"
            >
                ←
            </button>
            <button
                type="button"
                className={styles.liveBrowserPreviewToolbarButton}
                onClick={() => onNavigate('forward')}
                disabled={canGoForward === false}
                title="Go forward"
                aria-label="Go forward"
            >
                →
            </button>
            <button
                type="button"
                className={styles.liveBrowserPreviewToolbarButton}
                onClick={() => onNavigate('reload')}
                title="Reload page"
                aria-label="Reload page"
            >
                ↻
            </button>

            <form className={styles.liveBrowserPreviewUrlForm} onSubmit={handleUrlSubmit}>
                <input
                    type="text"
                    className={styles.liveBrowserPreviewUrlInput}
                    value={displayedUrl}
                    onChange={(event) => onUrlDraftChange(event.target.value)}
                    onBlur={() => onUrlDraftChange(null)}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Browser address"
                />
            </form>

            <button
                type="button"
                className={styles.liveBrowserPreviewToolbarButton}
                onClick={onZoomOut}
                title="Zoom out"
                aria-label="Zoom out"
            >
                −
            </button>
            <button
                type="button"
                className={classNames(styles.liveBrowserPreviewToolbarButton, styles.liveBrowserPreviewZoomLabel)}
                onClick={onZoomReset}
                title="Reset zoom"
                aria-label="Reset zoom"
            >
                {Math.round(zoomLevel * 100)}%
            </button>
            <button
                type="button"
                className={styles.liveBrowserPreviewToolbarButton}
                onClick={onZoomIn}
                title="Zoom in"
                aria-label="Zoom in"
            >
                +
            </button>
            <button
                type="button"
                className={styles.liveBrowserPreviewToolbarButton}
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            >
                ⛶
            </button>
            <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.liveBrowserPreviewToolbarButton}
                title="Open in new tab"
                aria-label="Open in new tab"
            >
                ↗
            </a>
        </div>
    );
}

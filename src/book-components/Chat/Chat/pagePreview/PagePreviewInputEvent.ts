/**
 * Pointer button forwarded from the client to the live page-preview browser.
 *
 * @private type shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export type PagePreviewPointerButton = 'left' | 'middle' | 'right';

/**
 * Browser-history action forwarded from the preview toolbar.
 *
 * @private type shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export type PagePreviewNavigationAction = 'back' | 'forward' | 'reload';

/**
 * One remote-control event forwarded from the live page-preview client to the headless browser.
 *
 * Pointer coordinates are expressed as ratios of the streamed viewport (`0` to `1`), so the client
 * does not need to know the exact remote viewport size.
 *
 * - `move` — hover / pointer movement
 * - `down` / `up` — raw pointer press and release (drag, text selection, double-click via `clickCount`)
 * - `click` — legacy single click kept for backward compatibility with older preview clients
 * - `wheel` — scrolling
 * - `keydown` / `keyup` — keyboard typing and shortcuts, `key` uses `KeyboardEvent.key` values
 * - `resize` — the client preview area changed, the remote viewport should follow
 * - `navigate` — browser-history navigation from the preview toolbar
 * - `goto` — navigate to one absolute HTTP(S) URL from the preview toolbar
 *
 * @private type shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export type PagePreviewInputEvent =
    | {
          readonly type: 'move';
          readonly xRatio: number;
          readonly yRatio: number;
      }
    | {
          readonly type: 'down';
          readonly xRatio: number;
          readonly yRatio: number;
          readonly button: PagePreviewPointerButton;
          readonly clickCount: number;
      }
    | {
          readonly type: 'up';
          readonly xRatio: number;
          readonly yRatio: number;
          readonly button: PagePreviewPointerButton;
          readonly clickCount: number;
      }
    | {
          readonly type: 'click';
          readonly xRatio: number;
          readonly yRatio: number;
      }
    | {
          readonly type: 'wheel';
          readonly xRatio: number;
          readonly yRatio: number;
          readonly deltaX: number;
          readonly deltaY: number;
      }
    | {
          readonly type: 'keydown';
          readonly key: string;
      }
    | {
          readonly type: 'keyup';
          readonly key: string;
      }
    | {
          readonly type: 'resize';
          readonly width: number;
          readonly height: number;
      }
    | {
          readonly type: 'navigate';
          readonly action: PagePreviewNavigationAction;
      }
    | {
          readonly type: 'goto';
          readonly url: string;
      };

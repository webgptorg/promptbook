import type { SubMenuItem } from './SubMenuItem';

/**
 * Tracks an opened nested desktop submenu and its anchor rectangle.
 *
 * @private internal state model of <Header/>
 */
export type OpenSubMenuState = {
    key: string;
    rect: DOMRect;
    items: SubMenuItem[];
};

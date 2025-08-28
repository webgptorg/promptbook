import { collectCssTextsForClass } from '../_common/react-utils/collectCssTextsForClass';
import styles from './BookEditor.module.css';

/**
 * Inject the CSS module rules (derived from imported `styles`) into the provided shadow root.
 * This allows CSS modules (which are normally emitted into the document head) to be
 * available inside the component's shadow DOM.
 *
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
 */
export function injectCssModuleIntoShadowRoot(shadowRoot: ShadowRoot) {
    try {
        const classNames = Object.values(styles)
            .flatMap((s) => String(s).split(/\s+/))
            .filter(Boolean);

        const cssParts: string[] = [];
        for (const cn of classNames) {
            cssParts.push(...collectCssTextsForClass(cn));
        }

        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-from', 'BookEditor.module');
        styleEl.textContent = cssParts.join('\n\n');
        shadowRoot.appendChild(styleEl);
    } catch (e) {
        // best-effort: don't crash the component if injection fails
        // console.error('Failed to inject CSS module into shadow root', e);
    }
}

/**
 * TODO: Make some utility functions for working with CSS modules in shadow DOM independent of `BookEditor.module.css`
 */

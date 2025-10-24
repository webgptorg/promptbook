import { collectCssTextsForClass } from '../../book-components/_common/react-utils/collectCssTextsForClass';
import type { string_css_class } from '../../types/typeAliases';

export type InjectCssModuleIntoShadowRootOptions = {
    /**
     * The shadow root where the styles should be injected
     */
    shadowRoot: ShadowRoot;

    /**
     * The imported CSS module styles object
     */
    styles: Record<string_css_class, string_css_class>;
};

/**
 * Inject the CSS module rules (derived from imported `styles`) into the provided shadow root.
 * This allows CSS modules (which are normally emitted into the document head) to be
 * available inside the component's shadow DOM.
 *
 * @public exported from `@promptbook/components`
 *         <- TODO: [🧠] Make `@promptbook/components-utils`
 * @deprecated This was used for BookEditor shadow DOM support, which is no longer needed
 */
export function injectCssModuleIntoShadowRoot(options: InjectCssModuleIntoShadowRootOptions) {
    const { shadowRoot, styles } = options;

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

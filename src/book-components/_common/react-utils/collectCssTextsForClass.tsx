
/**
 * Collect matching CSS texts from document stylesheets for a given class.
 * This will skip cross-origin stylesheets (they throw when accessed).
 *
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
 */
export function collectCssTextsForClass(className: string): string[] {
    const selector = `.${className}`;
    const out: string[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const rules = (sheet as CSSStyleSheet).cssRules;
            for (const r of Array.from(rules)) {
                // STYLE_RULE
                if (r && (r as CSSStyleRule).selectorText) {
                    const sel = (r as CSSStyleRule).selectorText || '';
                    if (sel.indexOf(selector) !== -1) {
                        out.push((r as CSSStyleRule).cssText);
                    }
                } else if ((r as CSSMediaRule).cssRules && (r as CSSMediaRule).conditionText) {
                    // MEDIA_RULE - search inside
                    const media = r as CSSMediaRule;
                    const inner: string[] = [];
                    for (const ir of Array.from(media.cssRules)) {
                        if (
                            ir &&
                            (ir as CSSStyleRule).selectorText &&
                            (ir as CSSStyleRule).selectorText.indexOf(selector) !== -1
                        ) {
                            inner.push((ir as CSSStyleRule).cssText);
                        }
                    }
                    if (inner.length) {
                        out.push(`@media ${media.conditionText} { ${inner.join('\n')} }`);
                    }
                }
            }
        } catch (err) {
            // Could be a cross-origin stylesheet; ignore it.
            // console.debug('skipping stylesheet', err);
        }
    }

    return out;
}

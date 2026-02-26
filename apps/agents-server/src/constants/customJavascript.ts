/**
 * Builds the default JavaScript prefill used by `/admin/custom-js`.
 * @private
 */
export function createDefaultCustomJavascript(): string {
    return [
        '/* Custom JavaScript for Promptbook Agents Server */',
        '/* This script is loaded on every page and can add helpers or integrations. */',
        '',
        '(function () {',
        '    if (window.__promptbookCustomJavascriptLoaded) {',
        '        return;',
        '    }',
        '    window.__promptbookCustomJavascriptLoaded = true;',
        '    const body = document.body;',
        '    body.classList.add("custom-js-loaded");',
        '    const markTimestamp = () => {',
        '        body.dataset.customJsTimestamp = new Date().toISOString();',
        '    };',
        '    markTimestamp();',
        '    const observer = new MutationObserver(markTimestamp);',
        '    observer.observe(body, { childList: true, subtree: true });',
        '})();',
    ].join('\n');
}

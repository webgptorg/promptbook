import { customStylesheetClassEntries } from '../../../constants/customStylesheet';

/**
 * Renders the selector reference sidebar for the custom CSS editor.
 *
 * @private function of CustomCssClient
 */
export function CustomCssSelectorsPanel() {
    return (
        <aside className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Common selectors</h2>
            <p className="mt-2 text-sm text-gray-600">
                These classes are attached by the chat renderer and can be safely targeted in custom CSS.
            </p>
            <ul className="mt-4 space-y-2">
                {customStylesheetClassEntries.map((entry) => (
                    <li key={entry.className} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="font-mono text-xs text-blue-700">.{entry.className}</div>
                        <div className="mt-1 text-xs text-gray-600">{entry.description}</div>
                    </li>
                ))}
            </ul>
        </aside>
    );
}

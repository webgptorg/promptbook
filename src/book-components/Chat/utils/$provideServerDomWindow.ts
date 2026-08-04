import type { WindowLike as DomWindowLike } from 'dompurify';
import { spaceTrim } from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import { EnvironmentMismatchError } from '../../../errors/EnvironmentMismatchError';

/**
 * Shared DOM window reused by every render which happens outside of a browser
 *
 * @private utility of `$provideServerDomWindow`
 */
let serverDomWindow: DomWindowLike | null = null;

/**
 * Provides a DOM `window` for runtimes which do not have one, for example Node.js during server-side rendering
 *
 * Note: `$` is used to indicate that this function is not a pure function - it creates and caches one shared DOM window
 *
 * @returns DOM window which can back a DOM-dependent library like `DOMPurify`
 * @throws {EnvironmentMismatchError} When the current runtime can not create a DOM window
 * @private utility of `renderMarkdown`
 */
export function $provideServerDomWindow(): DomWindowLike {
    if (serverDomWindow === null) {
        const { JSDOM } = requireServerDomLibrary();
        serverDomWindow = new JSDOM('').window as unknown as DomWindowLike;
    }

    return serverDomWindow;
}

/**
 * Loads `jsdom` which backs the DOM window outside of a browser
 *
 * Note: [😷] `jsdom` reaches for Node.js built-ins like `fs`, `child_process` and `net`, so browser bundlers must
 *       never follow the `require` below - even though it is unreachable in a browser, bundlers resolve it statically.
 *       They are told to replace `jsdom` with an empty module by the `browser` field of the generated package
 *       manifests, which is written by `applyBrowserUnsupportedDependencyStubs` during the package generation.
 *
 * @returns The `jsdom` library
 * @throws {EnvironmentMismatchError} When `jsdom` can not be loaded in the current runtime
 * @private utility of `$provideServerDomWindow`
 */
function requireServerDomLibrary(): typeof import('jsdom') {
    let serverDomLibrary: Partial<typeof import('jsdom')> | null = null;
    let serverDomLibraryError: Error | null = null;

    try {
        // Note: [😷] Keep `'jsdom'` written as a literal, bundlers do not replace a computed module name
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        serverDomLibrary = require('jsdom') as typeof import('jsdom');
    } catch (error) {
        assertsError(error);
        serverDomLibraryError = error;
    }

    if (typeof serverDomLibrary?.JSDOM !== 'function') {
        throw new EnvironmentMismatchError(
            spaceTrim(
                (block) => `
                    Markdown can not be rendered because there is no DOM in the current runtime.

                    Rendered markdown is sanitized through \`DOMPurify\`, which needs a DOM - the DOM of the browser
                    when the code runs in a browser and \`jsdom\` in every other runtime, for example during
                    server-side rendering in **Node.js**.

                    ${block(
                        serverDomLibraryError === null
                            ? 'The `jsdom` module was resolved but it does not export `JSDOM`, which happens when a bundler replaces `jsdom` with an empty module in a build which is neither a browser build nor a Node.js build.'
                            : `${serverDomLibraryError.name}: ${serverDomLibraryError.message}`,
                    )}
                `,
            ),
        );
    }

    return serverDomLibrary as typeof import('jsdom');
}

'use client';

// Note: Import `BookEditor` directly from its source module instead of the `components` package index,
//       because the full index pulls in Node-only dependencies (jsdom) which break the browser build
import { BookEditor } from '@promptbook-source/book-components/BookEditor/BookEditor';
import { DEVELOPER_AGENT_BOOK } from '@/data/developerAgentBook';

/**
 * Renders the default developer agent from `agents/developer.book` in a readonly `<BookEditor/>`.
 *
 * Note: Specified in [`specs/components/book-editor-embed.md`](../../../specs/components/book-editor-embed.md)
 */
export function DeveloperAgentBookPreview() {
    return (
        <BookEditor
            value={DEVELOPER_AGENT_BOOK}
            isReadonly
            theme="DARK"
            // Note: Heights are tuned per breakpoint so the whole agent fits without inner scrolling
            //       (the book text wraps more on narrow screens)
            height={null}
            className="h-[1450px] sm:h-[1100px]"
            isVerbose={false}
            translations={{
                readonlyMessage:
                    'This is a preview of agents/developer.book — run `ptbk coder init` to get your own editable copy.',
            }}
        />
    );
}

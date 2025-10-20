import { createPortal } from 'react-dom';
import type { BookEditorProps } from './BookEditor';
import { BookEditor } from './BookEditor';

/**
 * @private util of `<BookEditor />`
 */
export function BookEditorWrapper(props: BookEditorProps) {
    return createPortal(<BookEditor {...props} />, document.body);
}

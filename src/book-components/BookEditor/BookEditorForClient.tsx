import { useEffect, useState } from 'react';
import { BookEditorProps } from './BookEditor';

type BookEditorComponent = typeof import('./BookEditor').BookEditor;

/**
 * Renders a book editor
 *
 * @public exported from `@promptbook/components`
 */
export function BookEditorForClient(props: BookEditorProps) {
    const [BookEditorComponent, setBookEditorComponent] = useState<BookEditorComponent | null>(null);

    useEffect(() => {
        let isCancelled = false;

        void import('./BookEditor').then(({ BookEditor }) => {
            if (!isCancelled) {
                setBookEditorComponent(() => BookEditor);
            }
        });

        return () => {
            isCancelled = true;
        };
    }, []);

    if (!BookEditorComponent) {
        return <div style={{ minHeight: 260 }} />;
    }

    return <BookEditorComponent {...props} />;
}

'use client';

import { DEFAULT_BOOK, validateBook } from '../../_packages/core.index';
import { $induceBookDownload } from '../../utils/files/$induceBookDownload';
import styles from './BookEditor.module.css';

type BookEditorActionbarProps = {
    value: string | undefined;
};

/**
 *
 * @private Internal component used by `BookEditor`
 */
export function BookEditorActionbar(props: BookEditorActionbarProps) {
    const { value } = props;

    const handleDownload = () => {
        const book = validateBook(value || DEFAULT_BOOK);
        /* not await */ $induceBookDownload(book);
    };

    return (
        <div className={styles.bookEditorActionbar}>
            <button className={styles.button} onClick={handleDownload}>
                Download
            </button>
        </div>
    );
}

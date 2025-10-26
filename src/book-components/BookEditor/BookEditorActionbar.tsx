'use client';

import { DEFAULT_BOOK, parseAgentSource, validateBook } from '../../_packages/core.index';
import { titleToName } from '../../_packages/utils.index';
import { $induceFileDownload } from '../../utils/files/induceFileDownload';
import styles from './BookEditor.module.css';

type BookEditorActionbarProps = {
    value: string | undefined;
};

export function BookEditorActionbar(props: BookEditorActionbarProps) {
    const { value } = props;

    const handleDownload = () => {
        const bookContent = validateBook(value || DEFAULT_BOOK);

        const { agentName } = parseAgentSource(bookContent);
        const bookFile = new File([bookContent], `${titleToName(agentName || 'AI Avatar')}.book`, {
            type: 'application/json',
        });

        /* not await */ $induceFileDownload(bookFile);
    };

    return (
        <div className={styles.bookEditorActionbar}>
            <button className={styles.button} onClick={handleDownload}>
                Download
            </button>
        </div>
    );
}

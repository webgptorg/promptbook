'use client';

import { useState } from 'react';
// Note: Do not import from `../../package.json` because it would be included in the bundle
// TODO: [🧠] Is there a better way to get the version?
import { version } from '../../../package.json';
import { DEFAULT_BOOK, validateBook } from '../../_packages/core.index';
import { $induceBookDownload } from '../../utils/files/$induceBookDownload';
import { Modal } from '../_common/Modal/Modal';
import styles from './BookEditor.module.css';

type BookEditorActionbarProps = {
    value: string | undefined;
    isDownloadButtonShown?: boolean;
    isAboutButtonShown?: boolean;
};

/**
 *
 * @private Internal component used by `BookEditor`
 */
export function BookEditorActionbar(props: BookEditorActionbarProps) {
    const { value, isDownloadButtonShown, isAboutButtonShown } = props;
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

    const handleDownload = () => {
        const book = validateBook(value || DEFAULT_BOOK);
        /* not await */ $induceBookDownload(book);
    };

    return (
        <div className={styles.bookEditorActionbar}>
            {isDownloadButtonShown && (
                <button className={styles.button} onClick={handleDownload}>
                    Download
                </button>
            )}

            {isAboutButtonShown && (
                <button className={styles.button} onClick={() => setIsAboutModalOpen(true)}>
                    About
                </button>
            )}

            {isAboutModalOpen && (
                <Modal
                    onClose={() => {
                        setIsAboutModalOpen(false);
                    }}
                >
                    <h2>Promptbook Editor</h2>
                    <p>
                        This is an editor for the Promptbook.
                        {/* TODO: [🧠] Some better description */}
                    </p>
                    <p>
                        Version: <b>{version}</b>
                    </p>
                </Modal>
            )}
        </div>
    );
}

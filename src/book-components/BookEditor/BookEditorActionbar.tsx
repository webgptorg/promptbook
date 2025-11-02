'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useState } from 'react';
// Note: Do not import from `../../package.json` because it would be included in the bundle
// TODO: [🧠] Is there a better way to get the version?
import { DEFAULT_BOOK, validateBook } from '../../_packages/core.index';
import { $induceBookDownload } from '../../utils/files/$induceBookDownload';
import { AboutPromptbookInformation } from '../../utils/misc/AboutPromptbookInformation';
import { Dropdown } from '../_common/Dropdown/Dropdown';
import { Modal } from '../_common/Modal/Modal';
import { AboutIcon } from '../icons/AboutIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ExitFullscreenIcon } from '../icons/ExitFullscreenIcon';
import { FullscreenIcon } from '../icons/FullscreenIcon';
import styles from './BookEditor.module.css';

type BookEditorActionbarProps = {
    value: string | undefined;
    isDownloadButtonShown?: boolean;
    isAboutButtonShown?: boolean;
    isFullscreenButtonShown?: boolean;
    onFullscreenClick?: () => void;
    isFullscreen?: boolean;
};

/**
 *
 * @private Internal component used by `BookEditor`
 */
export function BookEditorActionbar(props: BookEditorActionbarProps) {
    const {
        value,
        isDownloadButtonShown,
        isAboutButtonShown,
        isFullscreenButtonShown,
        onFullscreenClick,
        isFullscreen,
    } = props;
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

    const handleDownload = () => {
        const book = validateBook(value || DEFAULT_BOOK);
        /* not await */ $induceBookDownload(book);
    };

    const actions = [];

    if (isDownloadButtonShown) {
        actions.push({
            icon: <DownloadIcon />,
            name: 'Download',
            onClick: handleDownload,
        });
    }

    if (isAboutButtonShown) {
        actions.push({
            icon: <AboutIcon />,
            name: 'About',
            onClick: () => setIsAboutModalOpen(true),
        });
    }

    if (isFullscreenButtonShown && onFullscreenClick) {
        actions.push({
            icon: <FullscreenIcon />,
            name: 'Fullscreen',
            onClick: onFullscreenClick,
        });
    }

    if (isFullscreen) {
        return (
            <div className={styles.bookEditorActionbar}>
                <button className={styles.button} onClick={onFullscreenClick}>
                    <ExitFullscreenIcon />
                </button>
            </div>
        );
    }

    return (
        <div className={styles.bookEditorActionbar}>
            {actions.length >= 2 ? (
                <Dropdown actions={actions} />
            ) : (
                actions.map(({ icon, name, onClick }) => (
                    <button key={name} className={styles.button} onClick={onClick}>
                        {icon}
                        <span>{name}</span>
                    </button>
                ))
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
                    <AboutPromptbookInformation />
                </Modal>
            )}
        </div>
    );
}

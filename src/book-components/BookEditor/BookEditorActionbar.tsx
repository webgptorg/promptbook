'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Note: Do not import from `../../package.json` because it would be included in the bundle
// TODO: [🧠] Is there a better way to get the version?
import { DEFAULT_BOOK, validateBook } from '../../book-2.0/agent-source/string_book';
import { $induceBookDownload } from '../../utils/files/$induceBookDownload';
import { AboutPromptbookInformation } from '../../utils/misc/xAboutPromptbookInformation';
import { AboutIcon } from '../icons/AboutIcon';
import { AttachmentIcon } from '../icons/AttachmentIcon';
import { CameraIcon } from '../icons/CameraIcon';
import { DownloadIcon } from '../icons/DownloadIcon';
import { ExitFullscreenIcon } from '../icons/ExitFullscreenIcon';
import { FullscreenIcon } from '../icons/FullscreenIcon';
import { Dropdown } from '../_common/Dropdown/Dropdown';
import { HoistedMenuItem, useMenuHoisting } from '../_common/MenuHoisting/MenuHoistingContext';
import { Modal } from '../_common/Modal/Modal';
import styles from './BookEditor.module.css';

type BookEditorActionbarProps = {
    value: string | undefined;
    isDownloadButtonShown?: boolean;
    isUploadButtonShown?: boolean;
    isCameraButtonShown?: boolean;
    isAboutButtonShown?: boolean;
    isFullscreenButtonShown?: boolean;
    onFullscreenClick?: () => void;
    onUploadDocument?: () => void;
    onTakePhoto?: () => void;
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
        isUploadButtonShown,
        isCameraButtonShown,
        isAboutButtonShown,
        isFullscreenButtonShown,
        onFullscreenClick,
        onUploadDocument,
        onTakePhoto,
        isFullscreen,
    } = props;
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const menuHoisting = useMenuHoisting();

    // Note: [1] We use ref to avoid re-creating the handleDownload function (and thus the actions array) on every value change
    const valueRef = useRef(value);
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    const handleDownload = useCallback(() => {
        const book = validateBook(valueRef.current || DEFAULT_BOOK);
        /* not await */ $induceBookDownload(book);
    }, []);

    const actions = useMemo(() => {
        const _actions: HoistedMenuItem[] = [];

        if (isUploadButtonShown && onUploadDocument) {
            _actions.push({
                icon: <AttachmentIcon />,
                name: 'Upload document',
                onClick: onUploadDocument,
            });
        }

        if (isCameraButtonShown && onTakePhoto) {
            _actions.push({
                icon: <CameraIcon />,
                name: 'Take photo',
                onClick: onTakePhoto,
            });
        }

        if (isDownloadButtonShown) {
            _actions.push({
                icon: <DownloadIcon />,
                name: 'Download',
                onClick: handleDownload,
            });
        }

        if (isAboutButtonShown) {
            _actions.push({
                icon: <AboutIcon />,
                name: 'About',
                onClick: () => setIsAboutModalOpen(true),
            });
        }

        if (isFullscreenButtonShown && onFullscreenClick) {
            _actions.push({
                icon: <FullscreenIcon />,
                name: 'Fullscreen',
                onClick: onFullscreenClick,
            });
        }
        return _actions;
    }, [
        isUploadButtonShown,
        onUploadDocument,
        isCameraButtonShown,
        onTakePhoto,
        isDownloadButtonShown,
        handleDownload,
        isAboutButtonShown,
        isFullscreenButtonShown,
        onFullscreenClick,
    ]);

    useEffect(() => {
        if (!menuHoisting || isFullscreen) {
            return;
        }

        menuHoisting.setMenu(actions);

        return () => {
            menuHoisting.setMenu([]);
        };
    }, [menuHoisting, actions, isFullscreen]);

    if (isFullscreen) {
        return (
            <div className={styles.bookEditorActionbar}>
                <button className={styles.button} onClick={onFullscreenClick}>
                    <ExitFullscreenIcon />
                </button>
            </div>
        );
    }

    if (menuHoisting && !isFullscreen) {
        return (
            <>
                {isAboutModalOpen && (
                    <Modal
                        onClose={() => {
                            setIsAboutModalOpen(false);
                        }}
                    >
                        <AboutPromptbookInformation />
                    </Modal>
                )}
            </>
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
                        {/* <span>{name}</span> <- Note: Do not show text on single action */}
                    </button>
                ))
            )}

            {isAboutModalOpen && (
                <Modal
                    onClose={() => {
                        setIsAboutModalOpen(false);
                    }}
                >
                    <AboutPromptbookInformation />
                </Modal>
            )}
        </div>
    );
}

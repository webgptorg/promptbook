import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { classNames } from '../react-utils/classNames';
import styles from './Modal.module.css';

/**
 *
 * @private internal subcomponent of `<Chat>` component
 */
export function Modal({
    children,
    onClose,
    className,
}: {
    children: ReactNode;
    onClose: () => void;
    className?: string;
}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return createPortal(
        <div className={styles.scrim} onClick={onClose}>
            <div className={classNames(styles.Modal, className)} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    &times;
                </button>
                {children}
            </div>
        </div>,
        document.body,
    );
}

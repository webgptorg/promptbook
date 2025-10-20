import { createPortal } from 'react-dom';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { classNames } from '../../_common/react-utils/classNames';
import { AvatarProfileFromSource } from './AvatarProfileFromSource';
import styles from './AvatarProfileTooltip.module.css';

/**
 *
 * @private internal subcomponent of `<Chat>` component
 */
export function AvatarProfileTooltip({
    agentSource,
    position,
}: {
    agentSource: string_book;
    position: { top: number; left: number };
}) {
    return createPortal(
        <div
            className={classNames(styles.AvatarProfileTooltip)}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
            }}
        >
            <div className={styles.arrow} />
            <AvatarProfileFromSource agentSource={agentSource} />
        </div>,
        document.body,
    );
}

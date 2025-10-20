import { forwardRef } from 'react';
import { createPortal } from 'react-dom';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { classNames } from '../../_common/react-utils/classNames';
import { AvatarProfileFromSource } from './AvatarProfileFromSource';
import styles from './AvatarProfileTooltip.module.css';

type AvatarProfileTooltipProps = {
    agentSource: string_book;
    position: { top: number; left: number };
};

/**
 *
 * @private internal subcomponent of `<Chat>` component
 */

export const AvatarProfileTooltip = forwardRef<HTMLDivElement, AvatarProfileTooltipProps>(function AvatarProfileTooltip(
    { agentSource, position },
    ref,
) {
    return createPortal(
        <div
            ref={ref}
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
});

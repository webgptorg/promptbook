import { useEffect, useRef, useState } from 'react';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import { CloseIcon } from '../../icons/CloseIcon';
import { AvatarProfileFromSource } from './AvatarProfileFromSource';
import styles from './AvatarProfileTooltip.module.css';

/**
 * Renders a tooltip with the avatar's profile information, ensuring it doesn't get cut off at the edges of the screen.
 *
 * @param {AgentSource} agentSource - The source of the agent's information.
 * @param {boolean} isVisible - Determines whether the tooltip is visible.
 * @returns {JSX.Element} The rendered tooltip component.
 *
 * @private internal subcomponent of `<Chat>` component
 */
export function AvatarProfileTooltip({
    agentSource,
    isVisible,
    onClose,
}: {
    agentSource: string_book;
    isVisible: boolean;
    onClose: () => void;
}) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipStyle, setTooltipStyle] = useState({});

    useEffect(() => {
        if (isVisible && tooltipRef.current) {
            const rect = tooltipRef.current.getBoundingClientRect();
            const screenWidth = window.innerWidth;

            if (rect.right > screenWidth) {
                setTooltipStyle({
                    left: 'auto',
                    right: '0',
                    transform: 'none',
                });
            } else if (rect.left < 0) {
                setTooltipStyle({
                    left: '0',
                    right: 'auto',
                    transform: 'none',
                });
            } else {
                setTooltipStyle({
                    left: '50%',
                    right: 'auto',
                    transform: 'translate(-20%,10%)',
                });
            }
        }
    }, [isVisible]);

    if (!isVisible) {
        return null;
    }

    return (
        <div ref={tooltipRef} className={styles.avatarTooltip} style={tooltipStyle}>
            <button className={styles.closeButton} onClick={onClose}>
                <CloseIcon />
            </button>
            <AvatarProfileFromSource agentSource={agentSource} />
        </div>
    );
}

import { Star } from 'lucide-react';
import type { CSSProperties, MouseEventHandler } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './Chat.module.css';

/**
 * Star values available in the chat feedback UI.
 *
 * @private constant of `<Chat/>`
 */
export const CHAT_FEEDBACK_STAR_RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * Fill color used for selected chat feedback stars.
 *
 * @private constant of `<Chat/>`
 */
const CHAT_FEEDBACK_STAR_ACTIVE_COLOR = '#ffd700';

/**
 * Icon size follows the surrounding star text size.
 *
 * @private constant of `<Chat/>`
 */
const CHAT_FEEDBACK_STAR_ICON_SIZE = '1em';

/**
 * Props for the shared chat feedback star icon.
 *
 * @private type of `<Chat/>`
 */
type ChatFeedbackStarProps = {
    readonly isActive: boolean;
    readonly inactiveColor: string;
    readonly className?: string;
    readonly onClick?: MouseEventHandler<HTMLSpanElement>;
    readonly onMouseEnter?: MouseEventHandler<HTMLSpanElement>;
    readonly onMouseLeave?: MouseEventHandler<HTMLSpanElement>;
};

/**
 * Resolves the inactive color for stars in the feedback controls.
 *
 * @param mode Current chat color mode.
 * @param tone Visual weight for the inactive star.
 * @returns Hex color for an inactive star.
 *
 * @private function of `<Chat/>`
 */
export function resolveChatFeedbackStarInactiveColor(mode: 'LIGHT' | 'DARK', tone: 'subtle' | 'muted' = 'subtle') {
    if (tone === 'muted') {
        return mode === 'LIGHT' ? '#888' : '#666';
    }

    return mode === 'LIGHT' ? '#ccc' : '#555';
}

/**
 * Renders one CSS-colored feedback star.
 *
 * @private component of `<Chat/>`
 */
export function ChatFeedbackStar({
    isActive,
    inactiveColor,
    className,
    onClick,
    onMouseEnter,
    onMouseLeave,
}: ChatFeedbackStarProps) {
    return (
        <span
            className={classNames(styles.feedbackStar, className)}
            style={
                {
                    '--chat-feedback-star-color': isActive ? CHAT_FEEDBACK_STAR_ACTIVE_COLOR : inactiveColor,
                } as CSSProperties
            }
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Star
                aria-hidden="true"
                focusable="false"
                className={styles.feedbackStarIcon}
                size={CHAT_FEEDBACK_STAR_ICON_SIZE}
                fill="currentColor"
            />
        </span>
    );
}

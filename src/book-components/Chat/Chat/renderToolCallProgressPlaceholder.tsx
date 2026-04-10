import { type ReactElement } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './Chat.module.css';

/**
 * Rendering options for the shared pending-state placeholder card.
 *
 * @private function of ChatToolCallModal
 */
type RenderToolCallProgressPlaceholderOptions = {
    /**
     * Title displayed at the top of the placeholder.
     */
    title: string;
    /**
     * Supporting message explaining the current state.
     */
    message: string;
    /**
     * Optional badge label shown in the header.
     */
    badgeLabel?: string;
};

/**
 * Renders a shared placeholder card for pending and partial tool-call details.
 *
 * @param options - Placeholder copy and optional badge label.
 * @returns Placeholder JSX.
 *
 * @private function of ChatToolCallModal
 */
export function renderToolCallProgressPlaceholder(options: RenderToolCallProgressPlaceholderOptions): ReactElement {
    return (
        <div className={styles.toolCallPendingCard}>
            <div className={styles.toolCallPendingHeader}>
                <span className={styles.toolCallPendingTitle}>{options.title}</span>
                <span className={styles.toolCallPendingBadge}>{options.badgeLabel || 'Running'}</span>
            </div>
            <p className={styles.toolCallPendingMessage}>{options.message}</p>
            <div className={styles.toolCallPendingSkeleton} aria-hidden="true">
                <span className={styles.toolCallPendingSkeletonLine} />
                <span className={styles.toolCallPendingSkeletonLine} />
                <span className={classNames(styles.toolCallPendingSkeletonLine, styles.toolCallPendingSkeletonShort)} />
            </div>
        </div>
    );
}

'use client';

import type { ReactElement } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import { AgentChip } from '../AgentChip';
import type { ToolCallChipEntry } from './createChatMessageToolCallRenderModel';
import styles from './Chat.module.css';

/**
 * Props for rendering the tool-call chip list below one chat message.
 *
 * @private internal component of `<ChatMessageItem/>`
 */
export type ChatMessageToolCallChipsProps = {
    /**
     * Tool-call chip entries to render.
     */
    readonly chips: ReadonlyArray<ToolCallChipEntry>;
    /**
     * Optional click handler for opening tool-call details.
     */
    readonly onToolCallClick?: (toolCall: ToolCallChipEntry['toolCall']) => void;
};

/**
 * Renders tool-call chips below one chat message.
 *
 * @private internal component of `<ChatMessageItem/>`
 */
export function ChatMessageToolCallChips({ chips, onToolCallClick }: ChatMessageToolCallChipsProps) {
    if (chips.length === 0) {
        return null;
    }

    return <div className={styles.toolCallChips}>{chips.map((chip) => renderToolCallChip(chip, onToolCallClick))}</div>;
}

/**
 * Renders a single tool-call chip button.
 *
 * @private internal helper of `<ChatMessageToolCallChips/>`
 */
function renderToolCallChip(
    chip: ToolCallChipEntry,
    onToolCallClick?: ChatMessageToolCallChipsProps['onToolCallClick'],
): ReactElement {
    const isOngoing = chip.status === 'ongoing';
    const hasErrors = chip.status === 'error';

    return (
        <button
            key={chip.key}
            type="button"
            className={classNames(
                styles.toolCallChip,
                chip.teamAgentData && styles.teamToolCall,
                chip.isTransitive && styles.transitiveToolCall,
                hasErrors && styles.toolCallWithError,
                isOngoing && styles.toolCallChipOngoing,
            )}
            onClick={(event) => {
                event.stopPropagation();
                if (onToolCallClick) {
                    onToolCallClick(chip.toolCall);
                }
            }}
            aria-busy={isOngoing}
        >
            {chip.teamAgentData && (
                <AgentChip
                    agent={chip.teamAgentData}
                    className={chip.isTransitive ? styles.transitiveAgentChip : styles.teamAgentChip}
                    isClickable={false}
                />
            )}
            <span className={styles.toolCallLabel}>{chip.label}</span>
            <span className={styles.toolCallChipStatus}>
                {isOngoing ? (
                    <span className={styles.toolCallChipSpinner} aria-hidden="true" />
                ) : hasErrors ? (
                    '⚠️'
                ) : null}
            </span>
        </button>
    );
}

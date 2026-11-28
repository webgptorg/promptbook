import { type ReactElement } from 'react';
import { validateBook } from '../../../book-2.0/agent-source/string_book';
import { Color } from '../../../utils/color/Color';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { BookEditor } from '../../BookEditor/BookEditor';
import { TeacherIcon } from '../../icons/TeacherIcon';
import type { ChatParticipant } from '../types/ChatParticipant';
import { buildSelfLearningSummary } from './ChatSelfLearningSummary';
import { SelfLearningAvatar } from './ChatToolCallModalComponents';
import styles from './Chat.module.css';
import type { ChatMessage } from '../types/ChatMessage';

/**
 * Rendering options for self-learning tool calls.
 *
 * @private function of ChatToolCallModal
 */
type RenderSelfLearningToolCallDetailsOptions = {
    /**
     * Tool call being rendered.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Parsed tool result payload.
     */
    resultRaw: TODO_any;
    /**
     * Optional agent metadata used for the header avatars.
     */
    agentParticipant?: ChatParticipant;
    /**
     * Fallback color used when participant metadata is incomplete.
     */
    buttonColor: WithTake<Color>;
};

/**
 * Renders the self-learning-specific tool call detail view.
 *
 * @param options - Self-learning tool call data.
 * @returns Self-learning summary UI.
 *
 * @private function of ChatToolCallModal
 */
export function renderSelfLearningToolCallDetails(options: RenderSelfLearningToolCallDetailsOptions): ReactElement {
    const { toolCall, resultRaw, agentParticipant, buttonColor } = options;
    const summary = buildSelfLearningSummary(toolCall, resultRaw);
    const agentLabel = String(agentParticipant?.fullname || agentParticipant?.name || 'Agent');
    const agentAvatarColor = Color.fromSafe(agentParticipant?.color || buttonColor).toHex();
    const commitmentsHeight = summary.commitmentsLineCount
        ? Math.min(Math.max(summary.commitmentsLineCount * 26, 140), 320)
        : 0;

    return (
        <>
            <div className={classNames(styles.searchModalHeader, styles.selfLearningModalHeader)}>
                <div className={styles.selfLearningAvatarGroup}>
                    <SelfLearningAvatar
                        label={agentLabel}
                        avatarSrc={agentParticipant?.avatarSrc}
                        avatarDefinition={agentParticipant?.avatarDefinition}
                        avatarVisualId={agentParticipant?.avatarVisualId}
                        fallbackColor={agentAvatarColor}
                    />
                    <SelfLearningAvatar label="Teacher" className={styles.selfLearningTeacher}>
                        <TeacherIcon size={18} />
                    </SelfLearningAvatar>
                </div>
                <div className={styles.selfLearningHeaderText}>
                    <h3 className={styles.selfLearningTitle}>Learned commitments</h3>
                </div>
            </div>

            <div className={styles.searchModalContent}>
                {(summary.samplesLabel || summary.updatedLabel) && (
                    <div className={styles.selfLearningMetaRow}>
                        {summary.samplesLabel && (
                            <span className={styles.selfLearningMetaChip}>{summary.samplesLabel}</span>
                        )}
                        {summary.updatedLabel && (
                            <span className={styles.selfLearningMeta}>Updated {summary.updatedLabel}</span>
                        )}
                    </div>
                )}
                <div className={styles.selfLearningCommitments}>
                    <span className={styles.selfLearningCommitmentsLabel}>Teacher updates</span>
                    {summary.commitments.length > 0 ? (
                        <div className={styles.selfLearningBookEditor}>
                            <BookEditor
                                value={validateBook(summary.commitmentsText)}
                                isReadonly={true}
                                height={commitmentsHeight}
                                isUploadButtonShown={false}
                                isCameraButtonShown={false}
                                isDownloadButtonShown={false}
                                isAboutButtonShown={false}
                                isFullscreenButtonShown={false}
                            />
                        </div>
                    ) : (
                        <div className={styles.selfLearningEmpty}>
                            {summary.hasTeacherCommitments
                                ? 'Commitments were added, but details were not provided.'
                                : 'No new commitments were added.'}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

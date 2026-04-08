'use client';

import { classNames } from '../../_common/react-utils/classNames';
import type { DictationRefinementSettings } from './refineFinalDictationChunk';
import type { SpeechStatusBubbleTone } from './resolveSpeechRecognitionUiDescriptor';
import styles from './Chat.module.css';

/**
 * Props for `<ChatInputAreaDictationPanel/>`.
 *
 * @private component of `<ChatInputArea/>`
 */
export type ChatInputAreaDictationPanelProps = {
    bubbleText?: string;
    bubbleTone?: SpeechStatusBubbleTone;
    shouldShowPanel: boolean;
    isExpanded: boolean;
    interimText: string;
    error: { code?: string; message: string } | null;
    lastFinalChunk: string;
    editableChunk: string;
    canBacktrack: boolean;
    dictationSettings: DictationRefinementSettings;
    isBrowserSpeechFallbackSupported: boolean;
    canOpenBrowserSettings: boolean;
    onToggleExpanded: () => void;
    onExpand: () => void;
    onEditableChunkChange: (nextValue: string) => void;
    onRetryPermissionRequest: () => void;
    onOpenBrowserSettings: () => void;
    onApplyCorrection: () => void;
    onBacktrackLastChunk: () => void;
    onDictationSettingChange: (
        settingName: 'autoPunctuation' | 'autoCapitalization' | 'removeFillerWords' | 'formatLists' | 'whisperMode',
        checked: boolean,
    ) => void;
};

/**
 * Renders speech-status details, transcript correction controls, and dictation settings.
 *
 * @private component of `<ChatInputArea/>`
 */
export function ChatInputAreaDictationPanel(props: ChatInputAreaDictationPanelProps) {
    const {
        bubbleText,
        bubbleTone,
        shouldShowPanel,
        isExpanded,
        interimText,
        error,
        lastFinalChunk,
        editableChunk,
        canBacktrack,
        dictationSettings,
        isBrowserSpeechFallbackSupported,
        canOpenBrowserSettings,
        onToggleExpanded,
        onExpand,
        onEditableChunkChange,
        onRetryPermissionRequest,
        onOpenBrowserSettings,
        onApplyCorrection,
        onBacktrackLastChunk,
        onDictationSettingChange,
    } = props;

    return (
        <>
            {bubbleText && (
                <button
                    className={classNames(
                        styles.speechStatusBubble,
                        bubbleTone === 'recording' && styles.speechStatusBubbleRecording,
                        bubbleTone === 'processing' && styles.speechStatusBubbleProcessing,
                        bubbleTone === 'error' && styles.speechStatusBubbleError,
                    )}
                    aria-live="polite"
                    type="button"
                    onClick={onToggleExpanded}
                >
                    <span className={styles.speechStatusBubbleDot} aria-hidden="true" />
                    <span>{bubbleText}</span>
                </button>
            )}

            {shouldShowPanel && (
                <section className={styles.dictationPanel} aria-live="polite">
                    <div className={styles.dictationPanelHeader}>
                        <span className={styles.dictationPanelTitle}>Dictation</span>
                        <button type="button" className={styles.dictationPanelToggle} onClick={onToggleExpanded}>
                            {isExpanded ? 'Hide details' : 'Show details'}
                        </button>
                    </div>

                    {interimText && (
                        <button type="button" className={styles.dictationInterimTranscript} onClick={onExpand}>
                            {interimText}
                        </button>
                    )}

                    {error && (
                        <div className={styles.dictationErrorPanel}>
                            <span>{error.message}</span>
                            <div className={styles.dictationErrorActions}>
                                <button type="button" onClick={onRetryPermissionRequest}>
                                    Retry microphone
                                </button>
                                {error.code === 'permission-denied' && canOpenBrowserSettings && (
                                    <button type="button" onClick={onOpenBrowserSettings}>
                                        Open browser settings
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {(isExpanded || Boolean(lastFinalChunk)) && (
                        <>
                            {lastFinalChunk && (
                                <div className={styles.dictationCorrectionPanel}>
                                    <label className={styles.dictationCorrectionLabel}>Edit last transcript chunk</label>
                                    <textarea
                                        className={styles.dictationCorrectionTextarea}
                                        value={editableChunk}
                                        onChange={(event) => onEditableChunkChange(event.target.value)}
                                    />
                                    <div className={styles.dictationCorrectionActions}>
                                        <button type="button" onClick={onApplyCorrection}>
                                            Apply correction
                                        </button>
                                        <button type="button" onClick={onBacktrackLastChunk} disabled={!canBacktrack}>
                                            Backtrack
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={styles.dictationSettingsPanel}>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.autoPunctuation}
                                        onChange={(event) =>
                                            onDictationSettingChange('autoPunctuation', event.target.checked)
                                        }
                                    />
                                    Auto punctuation
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.autoCapitalization}
                                        onChange={(event) =>
                                            onDictationSettingChange('autoCapitalization', event.target.checked)
                                        }
                                    />
                                    Auto capitalization
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.removeFillerWords}
                                        onChange={(event) =>
                                            onDictationSettingChange('removeFillerWords', event.target.checked)
                                        }
                                    />
                                    Remove fillers (um, uh, like)
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.formatLists}
                                        onChange={(event) =>
                                            onDictationSettingChange('formatLists', event.target.checked)
                                        }
                                    />
                                    Format list commands
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={dictationSettings.whisperMode}
                                        onChange={(event) => onDictationSettingChange('whisperMode', event.target.checked)}
                                    />
                                    Whisper mode
                                </label>
                            </div>

                            <p className={styles.dictationFallbackNote}>
                                Browser fallback:{' '}
                                {isBrowserSpeechFallbackSupported
                                    ? 'available (Web Speech API)'
                                    : 'not available in this browser'}
                            </p>
                        </>
                    )}
                </section>
            )}
        </>
    );
}

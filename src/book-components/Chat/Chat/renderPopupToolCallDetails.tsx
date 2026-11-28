import { type ReactElement } from 'react';
import { textColor } from '../../../utils/color/operators/furthest';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { Color } from '../../../utils/color/Color';
import styles from './Chat.module.css';

/**
 * Rendering options for popup tool calls.
 *
 * @private function of ChatToolCallModal
 */
type RenderPopupToolCallDetailsOptions = {
    /**
     * Parsed tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool result payload.
     */
    resultRaw: TODO_any;
    /**
     * Chat button color used for the CTA.
     */
    buttonColor: WithTake<Color>;
};

/**
 * Renders the popup-specific tool call detail view.
 *
 * @param options - Popup tool call data.
 * @returns Popup preview UI.
 *
 * @private function of ChatToolCallModal
 */
export function renderPopupToolCallDetails(options: RenderPopupToolCallDetailsOptions): ReactElement {
    const { args, resultRaw, buttonColor } = options;
    const url = args.url || (typeof resultRaw === 'string' && resultRaw.includes('http') ? resultRaw : null);

    return (
        <>
            <div className={classNames(styles.searchModalHeader, styles.emailModalHeader)}>
                <span className={styles.searchModalIcon}>🪟</span>
                <div className={styles.emailHeaderText}>
                    <span className={styles.emailHeaderLabel}>Popup</span>
                    <h3 className={styles.searchModalQuery}>Open Website</h3>
                </div>
            </div>

            <div className={styles.searchModalContent}>
                <div className={styles.emailContainer}>
                    <div className={styles.emailMetadata}>
                        <div className={styles.emailField}>
                            <strong>URL:</strong>
                            <span className={styles.emailRecipients}>
                                {url ? (
                                    <a href={url} target="_blank" rel="noreferrer">
                                        {url}
                                    </a>
                                ) : (
                                    'No URL provided'
                                )}
                            </span>
                        </div>
                    </div>
                    <div className={styles.emailBody}>
                        <p>The agent wants to open a popup window with the URL above.</p>
                        {url && (
                            <div style={{ marginTop: '20px' }}>
                                <button
                                    type="button"
                                    className={styles.messageButton}
                                    onClick={() => window.open(url, '_blank')}
                                    style={{
                                        backgroundColor: buttonColor.toHex(),
                                        color: buttonColor.then(textColor).toHex(),
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    Open Popup Now
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

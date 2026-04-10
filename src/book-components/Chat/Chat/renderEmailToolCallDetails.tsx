import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { classNames } from '../../_common/react-utils/classNames';
import { EmailIcon } from '../../icons/EmailIcon';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import styles from './Chat.module.css';

/**
 * Rendering options for email tool calls.
 *
 * @private function of ChatToolCallModal
 */
type RenderEmailToolCallDetailsOptions = {
    /**
     * Parsed tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool result payload.
     */
    resultRaw: TODO_any;
};

/**
 * Renders the email-specific tool call detail view.
 *
 * @param options - Email tool call data.
 * @returns Email preview UI.
 *
 * @private function of ChatToolCallModal
 */
export function renderEmailToolCallDetails(options: RenderEmailToolCallDetailsOptions): ReactElement {
    const { args, resultRaw } = options;
    const to = args.to || [];
    const cc = args.cc || [];
    const subject = args.subject || 'No subject';
    const body = args.body || '';
    const recipients = Array.isArray(to) ? to : [to];
    const ccRecipients = Array.isArray(cc) ? cc : [];
    const emailResult = resultRaw && typeof resultRaw === 'object' ? (resultRaw as Record<string, TODO_any>) : null;
    const from =
        (emailResult?.from as string | undefined) || (emailResult?.sender as string | undefined) || 'Configured sender';
    const status = typeof emailResult?.status === 'string' ? emailResult.status : null;

    return (
        <>
            <div className={classNames(styles.searchModalHeader, styles.emailModalHeader)}>
                <span className={styles.searchModalIcon}>
                    <EmailIcon size={26} />
                </span>
                <div className={styles.emailHeaderText}>
                    <span className={styles.emailHeaderLabel}>Email</span>
                    <h3 className={styles.searchModalQuery}>{subject}</h3>
                </div>
            </div>

            <div className={styles.searchModalContent}>
                <div className={styles.emailContainer}>
                    <div className={styles.emailMetadata}>
                        <div className={styles.emailField}>
                            <strong>From:</strong>
                            <span className={styles.emailRecipients}>{from}</span>
                        </div>
                        <div className={styles.emailField}>
                            <strong>To:</strong>
                            <span className={styles.emailRecipients}>{recipients.join(', ')}</span>
                        </div>
                        {ccRecipients.length > 0 && (
                            <div className={styles.emailField}>
                                <strong>CC:</strong>
                                <span className={styles.emailRecipients}>{ccRecipients.join(', ')}</span>
                            </div>
                        )}
                        <div className={styles.emailField}>
                            <strong>Subject:</strong>
                            <span>{subject}</span>
                        </div>
                        {status && (
                            <div className={styles.emailField}>
                                <strong>Status:</strong>
                                <span className={styles.emailStatus}>{status}</span>
                            </div>
                        )}
                    </div>
                    <div className={styles.emailBody}>
                        <strong>Message:</strong>
                        <div className={styles.emailBodyContent}>
                            <MarkdownContent content={body} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

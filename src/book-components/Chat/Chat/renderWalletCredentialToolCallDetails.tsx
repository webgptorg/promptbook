import { type ReactElement } from 'react';
import { TOOL_TITLES } from '../utils/getToolCallChipletInfo';
import type { WalletCredentialToolCallResult } from '../utils/walletCredentialToolCall';
import styles from './Chat.module.css';

/**
 * Rendering options for wallet credential tool calls.
 *
 * @private function of ChatToolCallModal
 */
type RenderWalletCredentialToolCallDetailsOptions = {
    /**
     * Safe credential usage metadata.
     */
    credential: WalletCredentialToolCallResult;
    /**
     * Optional timestamp of the action.
     */
    toolCallDate: Date | null;
};

/**
 * Renders a friendly wallet-credential usage summary for non-technical users.
 *
 * @param options - Credential payload and optional timestamp.
 * @returns Credential details section for the tool modal.
 * @private function of ChatToolCallModal
 */
export function renderWalletCredentialToolCallDetails(
    options: RenderWalletCredentialToolCallDetailsOptions,
): ReactElement {
    const { credential, toolCallDate } = options;
    const serviceLabel = formatWalletCredentialService(credential.service);
    const sourceToolNames = normalizeWalletCredentialSourceToolNames(credential);
    const sourceToolLabels = sourceToolNames.map((sourceToolName) => TOOL_TITLES[sourceToolName]?.title || sourceToolName);
    const usedByLabel = sourceToolLabels.length > 1 ? 'Used by actions' : 'Used by action';

    return (
        <>
            <header className={styles.toolCallHeader}>
                <span className={styles.toolCallIcon} aria-hidden="true">
                    🔐
                </span>
                <div className={styles.toolCallHeaderMeta}>
                    <p className={styles.toolCallModalLabel}>Credential</p>
                    <h3 className={styles.toolCallTitle}>{credential.credentialName}</h3>
                    <p className={styles.toolCallSubtitle}>Used securely from your wallet.</p>
                </div>
            </header>

            <div className={styles.toolCallGrid}>
                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>What it was used for</p>
                    <p className={styles.toolCallSummary}>{credential.purpose}</p>
                </section>

                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>Credential details</p>
                    <ul className={styles.toolCallList}>
                        <li className={styles.toolCallItem}>
                            <span className={styles.toolCallItemLabel}>Service</span>
                            <span className={styles.toolCallItemValue}>{serviceLabel}</span>
                        </li>
                        <li className={styles.toolCallItem}>
                            <span className={styles.toolCallItemLabel}>Credential reference</span>
                            <span className={styles.toolCallItemValue}>{credential.key}</span>
                        </li>
                        <li className={styles.toolCallItem}>
                            <span className={styles.toolCallItemLabel}>{usedByLabel}</span>
                            <span className={styles.toolCallItemValue}>{sourceToolLabels.join(', ')}</span>
                        </li>
                        {toolCallDate && (
                            <li className={styles.toolCallItem}>
                                <span className={styles.toolCallItemLabel}>Time</span>
                                <span className={styles.toolCallItemValue}>{toolCallDate.toLocaleString()}</span>
                            </li>
                        )}
                    </ul>
                </section>
            </div>
        </>
    );
}

/**
 * Normalizes source tool names attached to a wallet credential chip.
 *
 * @param credential - Credential payload from the synthetic wallet tool call.
 * @returns Ordered unique source tool names.
 * @private function of ChatToolCallModal
 */
function normalizeWalletCredentialSourceToolNames(credential: WalletCredentialToolCallResult): Array<string> {
    const normalizedNames = new Set<string>();
    const sourceToolNames =
        Array.isArray(credential.sourceToolNames) && credential.sourceToolNames.length > 0
            ? credential.sourceToolNames
            : [credential.sourceToolName];

    for (const sourceToolName of sourceToolNames) {
        if (typeof sourceToolName !== 'string') {
            continue;
        }

        const trimmedSourceToolName = sourceToolName.trim();
        if (!trimmedSourceToolName) {
            continue;
        }

        normalizedNames.add(trimmedSourceToolName);
    }

    return Array.from(normalizedNames.values());
}

/**
 * Converts internal service identifiers into human-friendly labels.
 *
 * @param service - Technical service identifier.
 * @returns Friendly service label.
 * @private function of ChatToolCallModal
 */
function formatWalletCredentialService(service: string): string {
    const normalizedService = service.trim().toLowerCase();
    if (normalizedService === 'smtp') {
        return 'Email (SMTP)';
    }
    if (normalizedService === 'github') {
        return 'GitHub';
    }
    return service;
}

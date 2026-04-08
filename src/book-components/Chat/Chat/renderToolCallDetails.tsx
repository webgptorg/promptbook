import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { getToolCallChipletInfo, TOOL_TITLES } from '../utils/getToolCallChipletInfo';
import { getToolCallTimestamp, parseToolCallArguments, parseToolCallResult } from '../utils/toolCallParsing';
import { resolveToolCallState } from '../utils/resolveToolCallState';
import {
    parseWalletCredentialToolCallResult,
    WALLET_CREDENTIAL_TOOL_CALL_NAME,
} from '../utils/walletCredentialToolCall';
import { Color } from '../../../utils/color/Color';
import { renderEmailToolCallDetails } from './renderEmailToolCallDetails';
import { renderMemoryToolCallDetails } from './renderMemoryToolCallDetails';
import { renderPopupToolCallDetails } from './renderPopupToolCallDetails';
import { renderRunBrowserToolCallDetails } from './renderRunBrowserToolCallDetails';
import { renderSearchToolCallDetails } from './renderSearchToolCallDetails';
import { renderSelfLearningToolCallDetails } from './renderSelfLearningToolCallDetails';
import { renderTimeToolCallDetails } from './renderTimeToolCallDetails';
import { renderTimeoutToolCallDetails } from './renderTimeoutToolCallDetails';
import { renderToolCallProgressPlaceholder } from './renderToolCallProgressPlaceholder';
import { renderWalletCredentialToolCallDetails } from './renderWalletCredentialToolCallDetails';
import { resolveToolCallProgressMessage } from './resolveToolCallProgressMessage';
import styles from './Chat.module.css';

/**
 * Options for rendering a tool call detail view.
 *
 * @private utility of `<ChatToolCallModal/>`
 */
type ToolCallDetailsOptions = {
    /**
     * Tool call to render.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Optional mapping of tool titles.
     */
    toolTitles?: Record<string, string>;
    /**
     * Agent participant metadata for avatar details.
     */
    agentParticipant?: ChatParticipant;
    /**
     * Chat button color for fallback styling.
     */
    buttonColor: WithTake<Color>;
    /**
     * Requests switching the modal into advanced technical mode.
     */
    onRequestAdvancedView?: () => void;
    /**
     * Optional BCP-47 locale string used to format time labels.
     */
    locale?: string;
    /**
     * Optional localized label overrides for the tool call modal UI.
     */
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations;
};

/**
 * One formatted request entry in the generic tool summary.
 *
 * @private function of ChatToolCallModal
 */
type ToolCallArgumentEntry = {
    /**
     * Human-friendly label derived from the raw argument key.
     */
    label: string;
    /**
     * Stringified argument value tailored for display.
     */
    value: string;
};

/**
 * Represents an error or warning surfaced inside the modal footer.
 *
 * @private function of ChatToolCallModal
 */
type ToolCallIssue = {
    /**
     * Visual severity of the issue badge.
     */
    type: 'error' | 'warning';
    /**
     * Human-readable badge label.
     */
    label: string;
    /**
     * Message shown inside the issue badge.
     */
    message: string;
};

/**
 * Renders the detail view for a single tool call.
 *
 * @param options - Rendering options for the tool call.
 * @returns Simple tool-call detail JSX.
 *
 * @private function of ChatToolCallModal
 */
export function renderToolCallDetails(options: ToolCallDetailsOptions): ReactElement {
    const { toolCall, toolTitles, agentParticipant, buttonColor, onRequestAdvancedView, locale, chatUiTranslations } =
        options;
    const resultRaw = parseToolCallResult(toolCall.result);
    const args = parseToolCallArguments(toolCall);
    const toolCallDate = getToolCallTimestamp(toolCall);
    const toolCallState = resolveToolCallState(toolCall);

    const memoryView = renderMemoryToolCallDetails({
        toolCall,
        args,
        resultRaw,
    });
    if (memoryView) {
        return memoryView;
    }

    const walletCredentialResult =
        toolCall.name === WALLET_CREDENTIAL_TOOL_CALL_NAME ? parseWalletCredentialToolCallResult(resultRaw) : null;
    if (walletCredentialResult) {
        return renderWalletCredentialToolCallDetails({
            credential: walletCredentialResult,
            toolCallDate,
        });
    }

    if (toolCall.name === 'run_browser') {
        return renderRunBrowserToolCallDetails({
            toolCall,
            args,
            resultRaw,
        });
    }

    if (toolCall.name === 'self-learning') {
        return renderSelfLearningToolCallDetails({
            toolCall,
            resultRaw,
            agentParticipant,
            buttonColor,
        });
    }

    if (isSearchToolCallName(toolCall.name)) {
        return renderSearchToolCallDetails({
            toolCall,
            args,
            resultRaw,
        });
    }

    if (isTimeToolCallName(toolCall.name)) {
        return renderTimeToolCallDetails({
            args,
            resultRaw,
            toolCallDate,
            locale,
            chatUiTranslations,
        });
    }

    if (isTimeoutToolCallName(toolCall.name)) {
        return renderTimeoutToolCallDetails({
            toolCallName: toolCall.name,
            args,
            resultRaw,
            toolCallDate,
            onRequestAdvancedView,
            locale,
            chatUiTranslations,
        });
    }

    if (isEmailToolCallName(toolCall.name)) {
        return renderEmailToolCallDetails({
            args,
            resultRaw,
        });
    }

    if (isPopupToolCallName(toolCall.name)) {
        return renderPopupToolCallDetails({
            args,
            resultRaw,
            buttonColor,
        });
    }

    return renderGenericToolCallDetails({
        toolCall,
        args,
        resultRaw,
        toolTitles,
        toolCallState,
        locale,
        chatUiTranslations,
    });
}

/**
 * Rendering options for the generic fallback tool view.
 *
 * @private function of ChatToolCallModal
 */
type RenderGenericToolCallDetailsOptions = {
    /**
     * Tool call being rendered.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Parsed arguments shown in the request section.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed result payload used for summaries.
     */
    resultRaw: TODO_any;
    /**
     * Optional localized tool titles.
     */
    toolTitles?: Record<string, string>;
    /**
     * Resolved tool call state.
     */
    toolCallState: ReturnType<typeof resolveToolCallState>;
    /**
     * Optional locale override passed to chip rendering.
     */
    locale?: string;
    /**
     * Optional localized label overrides.
     */
    chatUiTranslations?: import('./ChatProps').ChatUiTranslations;
};

/**
 * Renders the generic fallback summary used for unhandled tool types.
 *
 * @param options - Generic tool call rendering inputs.
 * @returns Generic summary UI.
 *
 * @private function of ChatToolCallModal
 */
function renderGenericToolCallDetails(options: RenderGenericToolCallDetailsOptions): ReactElement {
    const { toolCall, args, resultRaw, toolTitles, toolCallState, locale, chatUiTranslations } = options;
    const chipletInfo = getToolCallChipletInfo(toolCall, locale, toolTitles, chatUiTranslations);
    const toolMetadata = TOOL_TITLES[toolCall.name];
    const headerEmoji = toolMetadata?.emoji || extractLeadingEmoji(chipletInfo.text) || '🛠️';
    const headerTitle = toolTitles?.[toolCall.name] || toolMetadata?.title || chipletInfo.text || toolCall.name;
    const argumentEntries = buildArgumentEntries(args);
    const resultSummary = buildToolCallResultSummary(resultRaw);
    const resultCount = getResultItemCount(resultRaw);
    const toolCallIssues = normalizeToolCallIssues(toolCall);
    const shouldRenderRunningOutcome = toolCallState !== 'COMPLETE' && !resultSummary;
    const shouldRenderRunningRequestPlaceholder = toolCallState !== 'COMPLETE' && argumentEntries.length === 0;

    return (
        <>
            <header className={styles.toolCallHeader}>
                <span className={styles.toolCallIcon} aria-hidden="true">
                    {headerEmoji}
                </span>
                <div className={styles.toolCallHeaderMeta}>
                    <p className={styles.toolCallModalLabel}>Action</p>
                    <h3 className={styles.toolCallTitle}>{headerTitle}</h3>
                    <p className={styles.toolCallSubtitle}>
                        {toolCallState === 'COMPLETE'
                            ? 'Here is what happened.'
                            : resolveToolCallProgressMessage(toolCall)}
                    </p>
                </div>
            </header>

            <div className={styles.toolCallGrid}>
                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>Request</p>
                    {argumentEntries.length > 0 ? (
                        <ul className={styles.toolCallList}>
                            {argumentEntries.map((entry) => (
                                <li key={entry.label} className={styles.toolCallItem}>
                                    <span className={styles.toolCallItemLabel}>{entry.label}</span>
                                    <span className={styles.toolCallItemValue}>{entry.value}</span>
                                </li>
                            ))}
                        </ul>
                    ) : shouldRenderRunningRequestPlaceholder ? (
                        renderToolCallProgressPlaceholder({
                            title: 'Request details pending',
                            message: 'The agent started this action, but the detailed request payload has not arrived yet.',
                            badgeLabel: 'Pending',
                        })
                    ) : (
                        <p className={styles.toolCallEmpty}>No extra details were needed.</p>
                    )}
                </section>

                <section className={styles.toolCallPanel}>
                    <p className={styles.toolCallPanelTitle}>Outcome</p>
                    {resultSummary ? (
                        <p className={styles.toolCallSummary}>{resultSummary}</p>
                    ) : shouldRenderRunningOutcome ? (
                        renderToolCallProgressPlaceholder({
                            title: toolCallState === 'ERROR' ? 'Partial outcome available' : 'Outcome pending',
                            message: resolveToolCallProgressMessage(toolCall),
                            badgeLabel: toolCallState === 'ERROR' ? 'Error' : 'Running',
                        })
                    ) : (
                        <p className={styles.toolCallEmpty}>The action finished, but there is no short summary.</p>
                    )}
                    {typeof resultCount === 'number' && (
                        <div className={styles.toolCallSummaryMeta}>
                            <span className={styles.toolCallSummaryMetaBadge}>
                                Returned {resultCount} {resultCount === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                    )}
                </section>
            </div>

            {toolCallIssues.length > 0 && (
                <div className={styles.toolCallIssues}>
                    {toolCallIssues.map((issue, index) => (
                        <span
                            key={`${issue.type}-${index}`}
                            className={classNames(
                                styles.toolCallIssueBadge,
                                issue.type === 'warning' ? styles.toolCallIssueWarning : styles.toolCallIssueError,
                            )}
                        >
                            <strong>{issue.label}</strong>: {issue.message}
                        </span>
                    ))}
                </div>
            )}
        </>
    );
}

/**
 * Checks whether a tool name should use the search renderer.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the tool is a search-like tool.
 *
 * @private function of ChatToolCallModal
 */
function isSearchToolCallName(toolName: string): boolean {
    return toolName === 'web_search' || toolName === 'useSearchEngine' || toolName === 'search';
}

/**
 * Checks whether a tool name should use the time renderer.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the tool is a time-like tool.
 *
 * @private function of ChatToolCallModal
 */
function isTimeToolCallName(toolName: string): boolean {
    return toolName === 'get_current_time' || toolName === 'useTime';
}

/**
 * Checks whether a tool name should use the timeout renderer.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the tool is a timeout-like tool.
 *
 * @private function of ChatToolCallModal
 */
function isTimeoutToolCallName(toolName: string): boolean {
    return toolName === 'set_timeout' || toolName === 'cancel_timeout';
}

/**
 * Checks whether a tool name should use the email renderer.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the tool is an email-like tool.
 *
 * @private function of ChatToolCallModal
 */
function isEmailToolCallName(toolName: string): boolean {
    return toolName === 'send_email' || toolName === 'useEmail';
}

/**
 * Checks whether a tool name should use the popup renderer.
 *
 * @param toolName - Raw tool name.
 * @returns `true` when the tool is a popup-like tool.
 *
 * @private function of ChatToolCallModal
 */
function isPopupToolCallName(toolName: string): boolean {
    return toolName === 'open_popup' || toolName === 'usePopup' || toolName === 'popup';
}

/**
 * Builds a list of argument entries for the friendly summary view.
 *
 * @param args - Parsed tool call arguments.
 * @returns Array of display-ready argument entries.
 *
 * @private function of ChatToolCallModal
 */
function buildArgumentEntries(args: Record<string, TODO_any>): Array<ToolCallArgumentEntry> {
    return Object.entries(args).map(([key, value]) => ({
        label: formatArgumentLabel(key),
        value: formatArgumentValue(value),
    }));
}

/**
 * Normalizes a tool call argument key into human-readable text.
 *
 * @param key - Raw argument key.
 * @returns Humanized label.
 *
 * @private function of ChatToolCallModal
 */
function formatArgumentLabel(key: string): string {
    const replaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return replaced.charAt(0).toUpperCase() + replaced.slice(1);
}

/**
 * Converts a value into a display-friendly string without exposing raw JSON.
 *
 * @param value - Arbitrary tool call argument value.
 * @returns Friendly string.
 *
 * @private function of ChatToolCallModal
 */
function formatArgumentValue(value: TODO_any): string {
    if (value === null || value === undefined) {
        return 'Not provided';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const text = String(value);
        return text === '' ? 'Empty string' : text;
    }

    if (Array.isArray(value)) {
        const items = value.map((entry) => formatArgumentValue(entry)).filter(Boolean);
        return items.length > 0 ? items.join(', ') : '[array]';
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, TODO_any>)
            .map(([childKey, childValue]) => `${childKey}: ${formatArgumentValue(childValue)}`)
            .filter(Boolean);

        if (entries.length > 0) {
            const joined = entries.join('; ');
            return joined.length > 80 ? `${joined.slice(0, 80)}…` : joined;
        }

        const solo = JSON.stringify(value);
        return solo.length > 80 ? `${solo.slice(0, 80)}…` : solo;
    }

    return String(value);
}

/**
 * Extracts a short natural-language summary from the raw tool call result.
 *
 * @param resultRaw - Decoded tool call result.
 * @returns Friendly summary or `null` when nothing suitable is found.
 *
 * @private function of ChatToolCallModal
 */
function buildToolCallResultSummary(resultRaw: TODO_any): string | null {
    if (!resultRaw) {
        return null;
    }

    if (typeof resultRaw === 'string' && resultRaw.trim()) {
        return resultRaw.trim();
    }

    const candidate = findStringCandidate(resultRaw, ['summary', 'text', 'content', 'description', 'message', 'result']);
    if (candidate) {
        return candidate;
    }

    if (Array.isArray(resultRaw) && resultRaw.length > 0) {
        const firstEntry = resultRaw[0];
        if (typeof firstEntry === 'string' && firstEntry.trim()) {
            return firstEntry.trim();
        }
        const nested = findStringCandidate(firstEntry, ['title', 'snippet', 'summary']);
        if (nested) {
            return nested;
        }
    }

    return null;
}

/**
 * Searches for the first non-empty string field inside an object.
 *
 * @param value - Object to scan.
 * @param keys - Keys to try in order.
 * @returns First matching string or `null`.
 *
 * @private function of ChatToolCallModal
 */
function findStringCandidate(value: TODO_any, keys: string[]): string | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    for (const key of keys) {
        const candidate = (value as Record<string, TODO_any>)[key];
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return null;
}

/**
 * Counts items returned by the tool call when the payload is iterable.
 *
 * @param resultRaw - Tool call result payload.
 * @returns Item count or `null` when the result is not a collection.
 *
 * @private function of ChatToolCallModal
 */
function getResultItemCount(resultRaw: TODO_any): number | null {
    if (Array.isArray(resultRaw)) {
        return resultRaw.length;
    }

    if (resultRaw && typeof resultRaw === 'object') {
        const candidates = ['results', 'items', 'data'];
        for (const key of candidates) {
            const candidate = (resultRaw as Record<string, TODO_any>)[key];
            if (Array.isArray(candidate)) {
                return candidate.length;
            }
        }
    }

    return null;
}

/**
 * Normalizes raw tool call errors and warnings for display badges.
 *
 * @param toolCall - Tool call payload to inspect.
 * @returns Array of structured issues.
 *
 * @private function of ChatToolCallModal
 */
function normalizeToolCallIssues(toolCall: NonNullable<ChatMessage['toolCalls']>[number]): Array<ToolCallIssue> {
    const warnings = (toolCall.warnings || []).map((value) => ({
        type: 'warning' as const,
        label: 'Warning',
        message: formatIssueValue(value),
    }));

    const errors = (toolCall.errors || []).map((value) => ({
        type: 'error' as const,
        label: 'Error',
        message: formatIssueValue(value),
    }));

    if (errors.length === 0 && resolveToolCallState(toolCall) === 'ERROR') {
        errors.push({
            type: 'error',
            label: 'Error',
            message: 'The tool stopped before finishing successfully.',
        });
    }

    return [...warnings, ...errors];
}

/**
 * Formats an error or warning payload into a single-line string.
 *
 * @param value - Raw issue payload.
 * @returns String suitable for badge display.
 *
 * @private function of ChatToolCallModal
 */
function formatIssueValue(value: TODO_any): string {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
        const json = JSON.stringify(value);
        return json.length > 120 ? `${json.slice(0, 120)}…` : json;
    }

    return String(value ?? 'Unknown issue');
}

/**
 * Grabs the leading emoji from a chiplet label for fallback icons.
 *
 * @param text - Chiplet label text.
 * @returns First character or `null` when empty.
 *
 * @private function of ChatToolCallModal
 */
function extractLeadingEmoji(text?: string): string | null {
    if (!text) {
        return null;
    }

    const trimmed = text.trim();
    return trimmed ? trimmed[0]! : null;
}

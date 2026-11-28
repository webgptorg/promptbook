import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';

/**
 * Metadata for a single memory record returned by MEMORY tools.
 *
 * @private function of ChatToolCallModal
 */
type MemoryRecord = {
    /**
     * Unique identifier for the memory entry.
     */
    id?: string;
    /**
     * Stored memory text.
     */
    content?: string;
    /**
     * Indicates if the memory is shared across agents.
     */
    isGlobal?: boolean;
    /**
     * ISO timestamp when the memory was created.
     */
    createdAt?: string;
    /**
     * ISO timestamp when the memory was last updated.
     */
    updatedAt?: string;
};

/**
 * Possible status labels returned by MEMORY tool calls.
 *
 * @private function of ChatToolCallModal
 */
type MemoryStatusValue = 'stored' | 'ok' | 'disabled' | 'error' | string;

/**
 * Visual tone used to style memory status badges.
 *
 * @private function of ChatToolCallModal
 */
type MemoryStatusTone = 'success' | 'warning' | 'error' | 'neutral';

/**
 * Visual metadata describing how a memory status should appear.
 *
 * @private function of ChatToolCallModal
 */
type MemoryStatusInfo = {
    /**
     * Friendly label shown next to the status badge.
     */
    label: string;
    /**
     * Visual tone driving the badge styling.
     */
    tone: MemoryStatusTone;
};

/**
 * Normalized payload derived from the raw MEMORY tool result.
 *
 * @private function of ChatToolCallModal
 */
type MemoryToolResult = {
    /**
     * Tool action that produced the payload.
     */
    action: 'store' | 'retrieve';
    /**
     * Reported status string for the action.
     */
    status: MemoryStatusValue;
    /**
     * Optional user-friendly message describing the result.
     */
    message?: string;
    /**
     * Query text used to retrieve memories.
     */
    query?: string;
    /**
     * Record returned after storing a memory.
     */
    memory?: MemoryRecord;
    /**
     * Records returned after retrieving memories.
     */
    memories?: MemoryRecord[];
};

/**
 * Rendering options for the memory-specific tool call view.
 *
 * @private function of ChatToolCallModal
 */
type RenderMemoryToolCallDetailsOptions = {
    /**
     * Raw tool call payload.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Resolved tool call arguments.
     */
    args: Record<string, TODO_any>;
    /**
     * Parsed tool call result.
     */
    resultRaw: TODO_any;
};

/**
 * Maximum number of memory cards rendered inside the modal at once.
 *
 * @private function of ChatToolCallModal
 */
const MEMORY_DISPLAY_LIMIT = 3;

/**
 * CSS classes mapped by memory status tone.
 *
 * @private function of ChatToolCallModal
 */
const MEMORY_STATUS_CLASS_BY_TONE: Record<MemoryStatusTone, string> = {
    success: styles.memoryStatusSuccess,
    warning: styles.memoryStatusWarning,
    error: styles.memoryStatusError,
    neutral: styles.memoryStatusNeutral,
};

/**
 * Renders a friendly memory summary screen when a MEMORY tool call is selected.
 *
 * @param options - View fragments required to render the memory modal.
 * @returns Memory-specific modal JSX or `null` when the tool is unrelated.
 *
 * @private function of ChatToolCallModal
 */
export function renderMemoryToolCallDetails(options: RenderMemoryToolCallDetailsOptions): ReactElement | null {
    const { toolCall, args, resultRaw } = options;
    if (toolCall.name !== 'retrieve_user_memory' && toolCall.name !== 'store_user_memory') {
        return null;
    }

    const isStoreAction = toolCall.name === 'store_user_memory';
    const memoryResult = buildMemoryToolResult(resultRaw, isStoreAction ? 'store' : 'retrieve');
    if (!memoryResult) {
        return null;
    }

    const heroTitle = isStoreAction ? 'Memory saved' : 'Memories retrieved';
    const heroSubtitle = isStoreAction
        ? 'This detail is now stored so future chats will remember it.'
        : 'The agent pulled these facts from the memory vault.';
    const statusInfo = buildMemoryStatusInfo(memoryResult.status, memoryResult.action);
    const statusClass = MEMORY_STATUS_CLASS_BY_TONE[statusInfo.tone] || styles.memoryStatusNeutral;

    return (
        <>
            <div className={styles.memoryModalHeader}>
                <div className={styles.memoryModalIcon}>🧠</div>
                <div className={styles.memoryModalHeaderText}>
                    <h3 className={styles.memoryModalTitle}>{heroTitle}</h3>
                    <p className={styles.memoryModalSubtitle}>{heroSubtitle}</p>
                </div>
                <div className={classNames(styles.memoryModalStatus, statusClass)}>
                    <span className={styles.memoryStatusDot}></span>
                    {statusInfo.label}
                </div>
            </div>

            <div className={styles.memoryModalContent}>
                {memoryResult.message && <p className={styles.memoryMessage}>{memoryResult.message}</p>}

                {isStoreAction
                    ? renderMemoryStoreSection({ memoryResult, args })
                    : renderMemoryRetrieveSection({ memoryResult, args })}
            </div>
        </>
    );
}

/**
 * Renders the stored memory detail pane.
 *
 * @param options - Store action payload and arguments.
 * @returns Store-specific memory modal content.
 *
 * @private function of ChatToolCallModal
 */
function renderMemoryStoreSection(options: {
    memoryResult: MemoryToolResult;
    args: Record<string, TODO_any>;
}): ReactElement {
    const { memoryResult, args } = options;
    const storedScope = memoryResult.memory?.isGlobal ?? (typeof args.isGlobal === 'boolean' ? args.isGlobal : false);
    const scopeLabel = storedScope ? 'Global memory' : 'Personal memory';
    const scopeBadge = storedScope ? 'Global' : 'Personal';
    const storedContent =
        memoryResult.memory?.content?.trim() || (typeof args.content === 'string' ? args.content.trim() : '');
    const timestamp =
        formatMemoryTimestamp(memoryResult.memory?.updatedAt) ?? formatMemoryTimestamp(memoryResult.memory?.createdAt);

    return (
        <div className={styles.memoryStoreSection}>
            <div className={styles.memoryMetaRow}>
                <span className={styles.memoryMetaLabel}>Scope</span>
                <span className={styles.memoryMetaValue}>{scopeLabel}</span>
            </div>

            <div className={styles.memoryCard}>
                <div className={styles.memoryCardContent}>
                    {storedContent || 'No memory content was provided for this call.'}
                </div>
                <div className={styles.memoryCardMeta}>
                    <span className={styles.memoryScopeBadge}>{scopeBadge}</span>
                    {timestamp && <span>{timestamp}</span>}
                </div>
            </div>
        </div>
    );
}

/**
 * Renders the retrieved memories list.
 *
 * @param options - Retrieve action payload and arguments.
 * @returns Retrieve-specific memory modal content.
 *
 * @private function of ChatToolCallModal
 */
function renderMemoryRetrieveSection(options: {
    memoryResult: MemoryToolResult;
    args: Record<string, TODO_any>;
}): ReactElement {
    const { memoryResult, args } = options;
    const queryLabel = memoryResult.query?.trim() || (typeof args.query === 'string' ? args.query.trim() : '');
    const memories = (memoryResult.memories || [])
        .map((entry) => entry && normalizeMemoryRecord(entry))
        .filter((entry): entry is MemoryRecord => Boolean(entry && entry.content && entry.content.trim().length > 0));
    const displayedMemories = memories.slice(0, MEMORY_DISPLAY_LIMIT);
    const extraCount = memories.length - displayedMemories.length;

    return (
        <div className={styles.memoryRetrieveSection}>
            {queryLabel && (
                <div className={styles.memoryMetaRow}>
                    <span className={styles.memoryMetaLabel}>Search</span>
                    <span className={styles.memoryMetaValue}>&ldquo;{queryLabel}&rdquo;</span>
                </div>
            )}
            <div className={styles.memoryMetaRow}>
                <span className={styles.memoryMetaLabel}>Matches</span>
                <span className={styles.memoryMetaValue}>{memories.length}</span>
            </div>

            {memories.length === 0 ? (
                <div className={styles.memoryEmptyState}>
                    {memoryResult.message ||
                        (queryLabel
                            ? `No memories match “${queryLabel}”.`
                            : 'No memories were available for this conversation.')}
                </div>
            ) : (
                <>
                    <div className={styles.memoryList}>
                        {displayedMemories.map((memory, index) => {
                            const timestamp =
                                formatMemoryTimestamp(memory.updatedAt) ?? formatMemoryTimestamp(memory.createdAt);

                            return (
                                <div key={memory.id || `${memory.content}-${index}`} className={styles.memoryCard}>
                                    <div className={styles.memoryCardContent}>{memory.content}</div>
                                    <div className={styles.memoryCardMeta}>
                                        <span className={styles.memoryScopeBadge}>
                                            {memory.isGlobal ? 'Global' : 'Personal'}
                                        </span>
                                        {timestamp && <span>{timestamp}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {extraCount > 0 && (
                        <div className={styles.memoryListFooter}>
                            {extraCount} more {extraCount === 1 ? 'memory' : 'memories'} available.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Transforms the raw tool result into a normalized memory payload.
 *
 * @param raw - Raw data returned by the tool call.
 * @param fallbackAction - Action to assume when the payload does not declare one.
 * @returns Normalized memory details.
 *
 * @private function of ChatToolCallModal
 */
function buildMemoryToolResult(raw: TODO_any, fallbackAction: 'store' | 'retrieve'): MemoryToolResult | null {
    if (raw && typeof raw === 'object') {
        const normalizedMemories = Array.isArray(raw.memories)
            ? raw.memories
                  .map((entry: TODO_any) => entry && normalizeMemoryRecord(entry))
                  .filter((entry: MemoryRecord | null): entry is MemoryRecord => Boolean(entry))
            : [];

        const normalizedMemory = raw.memory ? normalizeMemoryRecord(raw.memory) ?? undefined : undefined;

        return {
            action: raw.action === 'store' ? 'store' : fallbackAction,
            status:
                (typeof raw.status === 'string' ? raw.status : undefined) ??
                (fallbackAction === 'store' ? 'stored' : 'ok'),
            message: typeof raw.message === 'string' ? raw.message : undefined,
            query: typeof raw.query === 'string' ? raw.query : undefined,
            memory: normalizedMemory,
            memories: normalizedMemories.length > 0 ? normalizedMemories : undefined,
        };
    }

    if (typeof raw === 'string') {
        return {
            action: fallbackAction,
            status: 'error',
            message: raw,
        };
    }

    return {
        action: fallbackAction,
        status: fallbackAction === 'store' ? 'stored' : 'ok',
    };
}

/**
 * Normalizes a memory record payload.
 *
 * @param entry - Input record from the memory tool.
 * @returns Normalized record or `null` when the entry is invalid.
 *
 * @private function of ChatToolCallModal
 */
function normalizeMemoryRecord(entry: TODO_any): MemoryRecord | null {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    return {
        id: typeof entry.id === 'string' ? entry.id : undefined,
        content: typeof entry.content === 'string' ? entry.content.trim() : undefined,
        isGlobal: entry.isGlobal === true,
        createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined,
    };
}

/**
 * Builds friendly status text and tone for memory actions.
 *
 * @param status - Raw status string returned by the tool.
 * @param action - Optional action to better describe neutral statuses.
 * @returns Label and tone for badge styling.
 *
 * @private function of ChatToolCallModal
 */
function buildMemoryStatusInfo(status: MemoryStatusValue, action: 'store' | 'retrieve'): MemoryStatusInfo {
    const normalized = (status || (action === 'store' ? 'stored' : 'ok')).toString().toLowerCase();

    if (normalized === 'stored') {
        return { label: 'Saved', tone: 'success' };
    }

    if (normalized === 'ok') {
        return { label: 'Loaded', tone: 'success' };
    }

    if (normalized === 'disabled') {
        return { label: 'Memory disabled', tone: 'warning' };
    }

    if (normalized === 'error') {
        return { label: 'Something went wrong', tone: 'error' };
    }

    return {
        label: action === 'store' ? 'Memory saved' : 'Memory retrieved',
        tone: 'neutral',
    };
}

/**
 * Formats ISO timestamps returned by memory records.
 *
 * @param value - Potential ISO timestamp string.
 * @returns Formatted label or `null` when the timestamp is invalid.
 *
 * @private function of ChatToolCallModal
 */
function formatMemoryTimestamp(value?: string): string | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

import { TODO_any } from '../../_packages/types.index';
import type { ToolCallLogEntry, ToolCallState } from '../../types/ToolCall';
import type { ChatAttachment } from '../../utils/chat/chatAttachments';

/**
 * Prompt parameter key used to pass hidden runtime context to tool execution.
 *
 * @private internal runtime wiring for commitment tools
 */
export const TOOL_RUNTIME_CONTEXT_PARAMETER = 'promptbookToolRuntimeContext';

/**
 * Hidden argument key used to pass runtime context into individual tool calls.
 *
 * @private internal runtime wiring for commitment tools
 */
export const TOOL_RUNTIME_CONTEXT_ARGUMENT = '__promptbookToolRuntimeContext';

/**
 * Prompt parameter key used to pass a hidden tool-progress listener token into script execution.
 *
 * @private internal runtime wiring for commitment tools
 */
export const TOOL_PROGRESS_TOKEN_PARAMETER = 'promptbookToolProgressToken';

/**
 * Hidden argument key used to pass a tool-progress listener token into individual tool calls.
 *
 * @private internal runtime wiring for commitment tools
 */
export const TOOL_PROGRESS_TOKEN_ARGUMENT = '__promptbookToolProgressToken';

/**
 * Incremental tool execution update emitted from long-running tools.
 *
 * @private internal runtime wiring for commitment tools
 */
export type ToolCallProgressUpdate = {
    /**
     * Optional state override associated with this update.
     */
    readonly state?: ToolCallState;

    /**
     * Optional incremental log entry appended to the tool-call stream.
     */
    readonly log?: ToolCallLogEntry;
};

/**
 * Listener notified when one long-running tool emits a progress update.
 *
 * @private internal runtime wiring for commitment tools
 */
type ToolCallProgressListener = (update: ToolCallProgressUpdate) => void;

/**
 * Monotonic counter used for hidden progress-listener tokens.
 *
 * @private internal runtime wiring for commitment tools
 */
let toolCallProgressListenerCounter = 0;

/**
 * Active tool-progress listeners keyed by hidden execution token.
 *
 * @private internal runtime wiring for commitment tools
 */
const toolCallProgressListeners = new Map<string, ToolCallProgressListener>();

/**
 * User geolocation payload shared with tools through hidden runtime context.
 *
 * @private internal runtime wiring for commitment tools
 */
export type UserLocationRuntimeContext = {
    permission?: 'granted' | 'denied' | 'unavailable';
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
    altitudeMeters?: number | null;
    headingDegrees?: number | null;
    speedMetersPerSecond?: number | null;
    timestamp?: string;
};

/**
 * Runtime context shape shared across commitment tools.
 *
 * @private internal runtime wiring for commitment tools
 */
export type ToolRuntimeContext = {
    memory?: {
        enabled?: boolean;
        userId?: number;
        username?: string;
        agentId?: string;
        agentName?: string;
        isTeamConversation?: boolean;
        isPrivateMode?: boolean;
    };
    userLocation?: UserLocationRuntimeContext;
    projects?: {
        githubToken?: string;
        repositories?: string[];
    };
    email?: {
        smtpCredential?: string;
        fromAddress?: string;
    };
    spawn?: {
        depth?: number;
        parentRunId?: string;
        parentAgentId?: string;
    };
    chat?: {
        chatId?: string;
        userId?: number;
        agentId?: string;
        agentName?: string;
        parameters?: Record<string, string>;
        attachments?: ReadonlyArray<ChatAttachment>;
    };
};

/**
 * Parses unknown runtime context payload into a normalized object.
 *
 * @private internal runtime wiring for commitment tools
 */
export function parseToolRuntimeContext(rawValue: unknown): ToolRuntimeContext | null {
    if (!rawValue) {
        return null;
    }

    let parsed: unknown = rawValue;

    if (typeof rawValue === 'string') {
        try {
            parsed = JSON.parse(rawValue);
        } catch {
            return null;
        }
    }

    if (!parsed || typeof parsed !== 'object') {
        return null;
    }

    return parsed as ToolRuntimeContext;
}

/**
 * Reads runtime context attached to tool call arguments.
 *
 * @private internal runtime wiring for commitment tools
 */
export function readToolRuntimeContextFromToolArgs(args: Record<string, TODO_any>): ToolRuntimeContext | null {
    return parseToolRuntimeContext(args[TOOL_RUNTIME_CONTEXT_ARGUMENT]);
}

/**
 * Reads the hidden tool-progress token from tool arguments.
 *
 * @private internal runtime wiring for commitment tools
 */
export function readToolProgressTokenFromToolArgs(args: Record<string, TODO_any>): string | null {
    const token = args[TOOL_PROGRESS_TOKEN_ARGUMENT];
    return typeof token === 'string' && token.trim().length > 0 ? token : null;
}

/**
 * Serializes runtime context for prompt parameters.
 *
 * @private internal runtime wiring for commitment tools
 */
export function serializeToolRuntimeContext(context: ToolRuntimeContext): string {
    return JSON.stringify(context);
}

/**
 * Registers one in-memory listener that receives progress updates emitted by a running tool.
 *
 * The returned token is passed into script execution as a hidden argument so tool implementations
 * can stream progress without exposing extra parameters to the model.
 *
 * @param listener - Listener notified about tool progress.
 * @returns Hidden token used to route progress updates.
 * @private internal runtime wiring for commitment tools
 */
export function registerToolCallProgressListener(listener: ToolCallProgressListener): string {
    toolCallProgressListenerCounter += 1;
    const token = `tool-progress:${Date.now()}:${toolCallProgressListenerCounter}`;
    toolCallProgressListeners.set(token, listener);
    return token;
}

/**
 * Unregisters one in-memory progress listener.
 *
 * @param token - Token previously created by `registerToolCallProgressListener`.
 * @private internal runtime wiring for commitment tools
 */
export function unregisterToolCallProgressListener(token: string): void {
    toolCallProgressListeners.delete(token);
}

/**
 * Emits one tool progress update using a hidden token carried in tool arguments.
 *
 * @param args - Raw tool arguments including hidden runtime keys.
 * @param update - Incremental progress update.
 * @returns `true` when a listener was found and notified.
 * @private internal runtime wiring for commitment tools
 */
export function emitToolCallProgressFromToolArgs(
    args: Record<string, TODO_any>,
    update: ToolCallProgressUpdate,
): boolean {
    const token = readToolProgressTokenFromToolArgs(args);
    if (!token) {
        return false;
    }

    const listener = toolCallProgressListeners.get(token);
    if (!listener) {
        return false;
    }

    listener(update);
    return true;
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 */

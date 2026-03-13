import { type ReactElement } from 'react';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { MonacoEditorWithShadowDom } from '../../_common/MonacoEditorWithShadowDom';
import type { ChatMessage } from '../types/ChatMessage';
import { getToolCallChipletInfo, TOOL_TITLES } from '../utils/getToolCallChipletInfo';
import { resolveToolCallState } from '../utils/resolveToolCallState';
import styles from './Chat.module.css';

/**
 * Rendering options for advanced raw payload details.
 *
 * @private function of ChatToolCallModal
 */
type AdvancedToolCallDetailsOptions = {
    /**
     * Tool call currently selected in the modal.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Optional mapping of tool titles.
     */
    toolTitles?: Record<string, string>;
};

/**
 * Monaco language identifiers used by advanced payload viewers.
 *
 * @private function of ChatToolCallModal
 */
type ToolCallPayloadLanguage = 'json' | 'plaintext';

/**
 * One payload section rendered in advanced mode.
 *
 * @private function of ChatToolCallModal
 */
type AdvancedToolCallPayloadSection = {
    /**
     * Stable section identifier used for Monaco model path.
     */
    id: string;
    /**
     * User-facing panel title.
     */
    title: string;
    /**
     * Raw payload value to render.
     */
    payload: TODO_any;
};

/**
 * Payload formatting result for Monaco rendering.
 *
 * @private function of ChatToolCallModal
 */
type FormattedToolCallPayload = {
    /**
     * Editor language used for syntax highlighting.
     */
    language: ToolCallPayloadLanguage;
    /**
     * Textual payload content displayed in Monaco.
     */
    content: string;
};

/**
 * Matches characters unsafe in Monaco in-memory model paths.
 *
 * @private function of ChatToolCallModal
 */
const INVALID_MONACO_MODEL_PATH_CHARACTER_PATTERN = /[^a-zA-Z0-9_-]/g;

/**
 * Line height used for read-only payload Monaco editors.
 *
 * @private function of ChatToolCallModal
 */
const TOOL_CALL_PAYLOAD_EDITOR_LINE_HEIGHT_PX = 19;

/**
 * Minimum Monaco editor height for payload blocks.
 *
 * @private function of ChatToolCallModal
 */
const TOOL_CALL_PAYLOAD_EDITOR_MIN_HEIGHT_PX = 114;

/**
 * Maximum Monaco editor height for payload blocks.
 *
 * @private function of ChatToolCallModal
 */
const TOOL_CALL_PAYLOAD_EDITOR_MAX_HEIGHT_PX = 418;

/**
 * Shared read-only Monaco settings for advanced payload rendering.
 *
 * @private function of ChatToolCallModal
 */
const TOOL_CALL_PAYLOAD_EDITOR_OPTIONS = {
    readOnly: true,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    folding: false,
    glyphMargin: false,
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 13,
    lineHeight: TOOL_CALL_PAYLOAD_EDITOR_LINE_HEIGHT_PX,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: 'none',
    contextmenu: false,
    scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
    },
    domReadOnly: true,
    wordWrap: 'off',
} as const;

/**
 * Matches characters that are unsafe in generated report filenames.
 *
 * @private function of ChatToolCallModal
 */
const TOOL_CALL_REPORT_FILENAME_UNSAFE_CHARACTER_PATTERN = /[^a-zA-Z0-9_-]/g;

/**
 * Renders a technical view with raw tool input/output payloads.
 *
 * @param options - Rendering options for advanced mode.
 * @private function of ChatToolCallModal
 */
export function renderAdvancedToolCallDetails(options: AdvancedToolCallDetailsOptions): ReactElement {
    const { toolCall } = options;
    const header = resolveAdvancedToolCallHeader(options);
    const payloadSections = createAdvancedToolCallPayloadSections(toolCall);

    return (
        <>
            <header className={styles.toolCallHeader}>
                <span className={styles.toolCallIcon} aria-hidden="true">
                    {header.emoji}
                </span>
                <div className={styles.toolCallHeaderMeta}>
                    <p className={styles.toolCallModalLabel}>Advanced</p>
                    <h3 className={styles.toolCallTitle}>{header.title}</h3>
                    <p className={styles.toolCallSubtitle}>
                        {header.subtitle} · {resolveToolCallState(toolCall).toLowerCase()}
                    </p>
                </div>
            </header>

            <div className={styles.toolCallGrid}>
                {payloadSections.map((payloadSection) => (
                    <section key={payloadSection.id} className={styles.toolCallPanel}>
                        <p className={styles.toolCallPanelTitle}>{payloadSection.title}</p>
                        {renderAdvancedToolCallPayload({
                            toolCall,
                            sectionId: payloadSection.id,
                            payload: payloadSection.payload,
                        })}
                    </section>
                ))}
            </div>
        </>
    );
}

/**
 * Builds a markdown advanced report for one tool call.
 *
 * The report includes the same payload sections rendered in the advanced modal,
 * so copied/saved output always mirrors the visible technical details.
 *
 * @param options - Rendering options for advanced mode.
 * @returns Markdown report content.
 * @private function of ChatToolCallModal
 */
export function createAdvancedToolCallReportMarkdown(options: AdvancedToolCallDetailsOptions): string {
    const { toolCall } = options;
    const header = resolveAdvancedToolCallHeader(options);
    const payloadSections = createAdvancedToolCallPayloadSections(toolCall);
    const reportLines: Array<string> = [
        '# Tool call report',
        '',
        `- **Title:** ${header.emoji} ${header.title}`,
        `- **Tool:** \`${header.subtitle}\``,
        `- **State:** \`${resolveToolCallState(toolCall)}\``,
    ];

    if (toolCall.createdAt) {
        reportLines.push(`- **Created at:** \`${toolCall.createdAt}\``);
    }

    if (toolCall.idempotencyKey) {
        reportLines.push(`- **Idempotency key:** \`${toolCall.idempotencyKey}\``);
    }

    reportLines.push('');

    for (const payloadSection of payloadSections) {
        const formattedPayload = formatToolCallPayload(payloadSection.payload);
        const markdownLanguage = formattedPayload.language === 'json' ? 'json' : 'text';

        reportLines.push(`## ${payloadSection.title}`);
        reportLines.push('');
        reportLines.push(`~~~${markdownLanguage}`);
        reportLines.push(formattedPayload.content);
        reportLines.push('~~~');
        reportLines.push('');
    }

    return reportLines.join('\n').trimEnd();
}

/**
 * Creates a stable filename for downloaded advanced tool-call reports.
 *
 * @param toolCall - Tool call currently selected in the modal.
 * @returns Safe markdown filename.
 * @private function of ChatToolCallModal
 */
export function createAdvancedToolCallReportFilename(toolCall: NonNullable<ChatMessage['toolCalls']>[number]): string {
    const safeToolName = toolCall.name.replace(TOOL_CALL_REPORT_FILENAME_UNSAFE_CHARACTER_PATTERN, '-');
    const sanitizedToolName = safeToolName.replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tool-call';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    return `tool-call-report-${sanitizedToolName}-${timestamp}.md`;
}

/**
 * Resolves title/subtitle/icon metadata for advanced modal header and report output.
 *
 * @param options - Rendering options for advanced mode.
 * @returns Resolved display metadata for the selected tool call.
 * @private function of ChatToolCallModal
 */
function resolveAdvancedToolCallHeader(options: AdvancedToolCallDetailsOptions): {
    emoji: string;
    title: string;
    subtitle: string;
} {
    const { toolCall, toolTitles } = options;
    const chipletInfo = getToolCallChipletInfo(toolCall);
    const toolMetadata = TOOL_TITLES[toolCall.name];

    return {
        emoji: toolMetadata?.emoji || extractLeadingEmoji(chipletInfo.text) || '🛠️',
        title: toolTitles?.[toolCall.name] || toolMetadata?.title || chipletInfo.text || toolCall.name,
        subtitle: toolCall.name,
    };
}

/**
 * Builds the shared payload sections shown in advanced view and exported reports.
 *
 * @param toolCall - Tool call currently selected in the modal.
 * @returns Ordered list of payload sections.
 * @private function of ChatToolCallModal
 */
function createAdvancedToolCallPayloadSections(
    toolCall: NonNullable<ChatMessage['toolCalls']>[number],
): Array<AdvancedToolCallPayloadSection> {
    const requestPayload = {
        toolName: toolCall.name,
        state: resolveToolCallState(toolCall),
        arguments: toolCall.arguments,
    };

    return [
        { id: 'request', title: 'Input payload', payload: requestPayload },
        { id: 'logs', title: 'Streamed logs', payload: toolCall.logs ?? [] },
        { id: 'result', title: 'Output payload', payload: toolCall.result },
        { id: 'raw-model', title: 'Model payload', payload: toolCall.rawToolCall },
        { id: 'event', title: 'Full event', payload: toolCall },
    ];
}

/**
 * Rendering options for one advanced Monaco payload section.
 *
 * @private function of ChatToolCallModal
 */
type RenderAdvancedToolCallPayloadOptions = {
    /**
     * Tool call shown in the modal.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Unique section id used for Monaco model isolation.
     */
    sectionId: string;
    /**
     * Raw payload for this section.
     */
    payload: TODO_any;
};

/**
 * Renders one advanced payload block using Monaco with syntax highlighting.
 *
 * @param options - Rendering options for one payload section.
 * @returns Monaco-backed payload renderer.
 * @private function of ChatToolCallModal
 */
function renderAdvancedToolCallPayload(options: RenderAdvancedToolCallPayloadOptions): ReactElement {
    const { toolCall, sectionId, payload } = options;
    const formattedPayload = formatToolCallPayload(payload);
    const modelPath = createToolCallPayloadMonacoPath({
        toolCall,
        sectionId,
        language: formattedPayload.language,
    });
    const editorHeight = resolveToolCallPayloadEditorHeight(formattedPayload.content);

    return (
        <div className={styles.toolCallPayloadContainer}>
            <div className={styles.toolCallPayloadEditor}>
                <MonacoEditorWithShadowDom
                    height={`${editorHeight}px`}
                    language={formattedPayload.language}
                    path={modelPath}
                    value={formattedPayload.content}
                    theme="vs-light"
                    options={TOOL_CALL_PAYLOAD_EDITOR_OPTIONS}
                />
            </div>
        </div>
    );
}

/**
 * Resolves Monaco editor height from payload line count with bounded limits.
 *
 * @param content - Editor payload content.
 * @returns Height in pixels.
 * @private function of ChatToolCallModal
 */
function resolveToolCallPayloadEditorHeight(content: string): number {
    const lineCount = content.split(/\r?\n/).length;
    const estimatedHeight = lineCount * TOOL_CALL_PAYLOAD_EDITOR_LINE_HEIGHT_PX;

    return Math.min(
        Math.max(estimatedHeight, TOOL_CALL_PAYLOAD_EDITOR_MIN_HEIGHT_PX),
        TOOL_CALL_PAYLOAD_EDITOR_MAX_HEIGHT_PX,
    );
}

/**
 * Options required to build one Monaco model path for advanced payload rendering.
 *
 * @private function of ChatToolCallModal
 */
type CreateToolCallPayloadMonacoPathOptions = {
    /**
     * Tool call shown inside the modal.
     */
    toolCall: NonNullable<ChatMessage['toolCalls']>[number];
    /**
     * Payload section identifier.
     */
    sectionId: string;
    /**
     * Monaco language used for this payload.
     */
    language: ToolCallPayloadLanguage;
};

/**
 * Builds a stable Monaco model path so advanced payload editors stay isolated.
 *
 * @param options - Path composition inputs.
 * @returns Stable in-memory Monaco model URI.
 * @private function of ChatToolCallModal
 */
function createToolCallPayloadMonacoPath(options: CreateToolCallPayloadMonacoPathOptions): string {
    const { toolCall, sectionId, language } = options;
    const stableToolIdentifier = sanitizeMonacoPathPart(
        `${toolCall.name}-${toolCall.idempotencyKey || toolCall.createdAt || 'event'}`,
    );
    const safeSectionId = sanitizeMonacoPathPart(sectionId);
    const extension = language === 'json' ? 'json' : 'txt';

    return `memory://tool-call-modal/${stableToolIdentifier}-${safeSectionId}.${extension}`;
}

/**
 * Normalizes text into a Monaco-safe path segment.
 *
 * @param value - Raw segment value.
 * @returns Monaco-safe segment string.
 * @private function of ChatToolCallModal
 */
function sanitizeMonacoPathPart(value: string): string {
    return value.replace(INVALID_MONACO_MODEL_PATH_CHARACTER_PATTERN, '-');
}

/**
 * Attempts to parse a string as JSON payload.
 *
 * @param value - Raw string payload.
 * @returns Parsed payload when string is JSON, otherwise `undefined`.
 * @private function of ChatToolCallModal
 */
function tryParseJsonString(value: string): TODO_any | undefined {
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
        return undefined;
    }

    try {
        return JSON.parse(trimmedValue);
    } catch {
        return undefined;
    }
}

/**
 * Converts raw payloads into Monaco-friendly formatted output.
 *
 * JSON objects are pretty printed, and JSON strings are parsed and re-stringified for readability.
 *
 * @param value - Raw payload value.
 * @returns Monaco language + formatted content.
 * @private function of ChatToolCallModal
 */
function formatToolCallPayload(value: TODO_any): FormattedToolCallPayload {
    if (value === undefined) {
        return { language: 'plaintext', content: 'undefined' };
    }

    if (value === null) {
        return { language: 'json', content: 'null' };
    }

    if (typeof value === 'string') {
        const parsedJsonString = tryParseJsonString(value);

        if (parsedJsonString === undefined) {
            return { language: 'plaintext', content: value };
        }

        return { language: 'json', content: JSON.stringify(parsedJsonString, null, 2) };
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return { language: 'json', content: JSON.stringify(value, null, 2) };
    }

    if (typeof value === 'bigint') {
        return { language: 'plaintext', content: String(value) };
    }

    try {
        const serialized = JSON.stringify(value, null, 2);
        if (serialized === undefined) {
            return { language: 'plaintext', content: String(value) };
        }

        return { language: 'json', content: serialized };
    } catch {
        return { language: 'plaintext', content: String(value) };
    }
}

/**
 * Grabs the leading emoji (if present) from a chiplet label for fallback icons.
 *
 * @param text - Chiplet label text.
 * @returns First character or `null` when empty.
 * @private function of ChatToolCallModal
 */
function extractLeadingEmoji(text?: string): string | null {
    if (!text) {
        return null;
    }

    const trimmed = text.trim();
    return trimmed ? trimmed[0]! : null;
}

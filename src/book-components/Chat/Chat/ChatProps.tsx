'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import type { CSSProperties, ReactNode } from 'react';
import type { Promisable } from 'type-fest';
import type { SpeechRecognition } from '../../../types/SpeechRecognition';
import type { string_href } from '../../../types/string_href';
import type { string_color } from '../../../types/string_person_fullname';
import { Color } from '../../../utils/color/Color';
import type { AgentChipData } from '../AgentChip/AgentChip';
import type { string_chat_format_name } from '../save/_common/string_chat_format_name';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';

/**
 * Response data returned by the optional `onFeedback` handler.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatFeedbackResponse = {
    /**
     * Optional text that should be shown to the user after the feedback is saved.
     */
    readonly message?: string;
};

/**
 * Visual mode for post-response feedback actions.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatFeedbackMode = 'off' | 'stars' | 'report_issue';

/**
 * Visual presentation mode used for chat messages.
 *
 * - `BUBBLE_MODE`: user and agent messages render as bubbles.
 * - `ARTICLE_MODE`: user messages stay as bubbles; agent messages render as seamless article blocks.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatVisualMode = 'BUBBLE_MODE' | 'ARTICLE_MODE';

/**
 * Optional text overrides for feedback UI copy.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatFeedbackTranslations = {
    /**
     * Tooltip shown on the report-issue quick action button.
     */
    readonly reportIssueButtonTitle?: string;
    /**
     * Accessible label shown on the report-issue quick action button.
     */
    readonly reportIssueButtonAriaLabel?: string;
    /**
     * Modal heading shown when user reports an issue.
     */
    readonly reportIssueModalTitle?: string;
    /**
     * Modal heading shown when user rates a response with stars.
     */
    readonly rateResponseModalTitle?: string;
    /**
     * Label shown above the original user question preview.
     */
    readonly userQuestionLabel?: string;
    /**
     * Label for expected-answer field in report-issue mode.
     */
    readonly reportIssueExpectedAnswerLabel?: string;
    /**
     * Label for expected-answer field in stars mode.
     */
    readonly expectedAnswerLabel?: string;
    /**
     * Placeholder for expected-answer input.
     */
    readonly expectedAnswerPlaceholder?: string;
    /**
     * Label for free-form issue details in report-issue mode.
     */
    readonly reportIssueDetailsLabel?: string;
    /**
     * Label for free-form note input in stars mode.
     */
    readonly noteLabel?: string;
    /**
     * Placeholder for free-form issue details input.
     */
    readonly reportIssueDetailsPlaceholder?: string;
    /**
     * Placeholder for free-form note input.
     */
    readonly notePlaceholder?: string;
    /**
     * Cancel button label shown in the feedback modal.
     */
    readonly cancelLabel?: string;
    /**
     * Submit button label shown in report-issue mode.
     */
    readonly reportIssueSubmitLabel?: string;
    /**
     * Submit button label shown in stars mode.
     */
    readonly submitLabel?: string;
    /**
     * Toast message shown when generic feedback is stored.
     */
    readonly feedbackSuccessMessage?: string;
    /**
     * Toast message shown when issue report is stored.
     */
    readonly reportIssueSuccessMessage?: string;
    /**
     * Toast message shown when feedback storage fails.
     */
    readonly feedbackErrorMessage?: string;
};

/**
 * Optional text overrides for general Chat UI strings such as button labels, lifecycle
 * state badges, tool call modal controls, and the default input placeholder.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatUiTranslations = {
    /**
     * Default placeholder shown in the message input when no custom placeholder is provided.
     * @default "Write a message..."
     */
    readonly inputPlaceholder?: string;

    /**
     * Label shown above quoted reply previews in both composer and reply bubbles.
     * @default "Replying to"
     */
    readonly replyingToLabel?: string;

    /**
     * Visible label for the explicit reply action on one message.
     * @default "Reply"
     */
    readonly replyActionLabel?: string;

    /**
     * Accessible title for the explicit reply action on one message.
     * @default "Reply to this message"
     */
    readonly replyActionTitle?: string;

    /**
     * Accessible label for the composer button that cancels reply mode.
     * @default "Cancel reply"
     */
    readonly cancelReplyLabel?: string;

    /**
     * Label for the "Save" button in the chat actions bar.
     * @default "Save"
     */
    readonly saveButtonLabel?: string;

    /**
     * Label for the "New chat" button in the chat actions bar.
     * @default "New chat"
     */
    readonly newChatButtonLabel?: string;

    /**
     * Lifecycle badge label for messages being sent by the user.
     * @default "Sending"
     */
    readonly lifecycleSending?: string;

    /**
     * Lifecycle badge label for queued messages.
     * @default "Queued"
     */
    readonly lifecycleQueued?: string;

    /**
     * Lifecycle badge label for running messages.
     * @default "Running"
     */
    readonly lifecycleRunning?: string;

    /**
     * Lifecycle badge label for failed messages.
     * @default "Failed"
     */
    readonly lifecycleFailed?: string;

    /**
     * Lifecycle badge label for cancelled messages.
     * @default "Cancelled"
     */
    readonly lifecycleCancelled?: string;

    /**
     * Lifecycle badge label for completed messages.
     * @default "Completed"
     */
    readonly lifecycleCompleted?: string;

    /**
     * Accessible label for the tool call details modal dialog.
     * @default "Tool call details"
     */
    readonly toolCallModalTitle?: string;

    /**
     * Accessible label for the close button in the tool call details modal.
     * @default "Close tool call details"
     */
    readonly toolCallModalCloseLabel?: string;

    /**
     * Label for the "Copy" button in the tool call details modal footer.
     * @default "Copy"
     */
    readonly toolCallModalCopyLabel?: string;

    /**
     * Label for the "Save" button in the tool call details modal footer.
     * @default "Save"
     */
    readonly toolCallModalSaveLabel?: string;

    /**
     * Label for switching to the advanced view in the tool call details modal.
     * @default "Advanced"
     */
    readonly toolCallModalAdvancedLabel?: string;

    /**
     * Label for switching back to the simple view in the tool call details modal.
     * @default "Simple"
     */
    readonly toolCallModalSimpleLabel?: string;

    // ── Timeout tool-call modal ──────────────────────────────────────────────

    /**
     * Title shown when a timeout has been successfully scheduled.
     * @default "Timeout scheduled"
     */
    readonly toolCallTimeoutTitle?: string;

    /**
     * Title shown when a timeout has been cancelled.
     * @default "Timeout cancelled"
     */
    readonly toolCallTimeoutCancelledTitle?: string;

    /**
     * Title shown when a timeout status update is received.
     * @default "Timeout update"
     */
    readonly toolCallTimeoutUpdateTitle?: string;

    /**
     * Label for the "Cancel" quick-action button inside the timeout modal.
     * @default "Cancel"
     */
    readonly toolCallTimeoutCancelButton?: string;

    /**
     * Label for the "Snooze" quick-action button inside the timeout modal.
     * @default "Snooze"
     */
    readonly toolCallTimeoutSnoozeButton?: string;

    /**
     * Label for the "View advanced" quick-action button inside the timeout modal.
     * @default "View advanced"
     */
    readonly toolCallTimeoutViewAdvancedButton?: string;

    /**
     * Message shown in the timeout modal when presentation data is still loading.
     * @default "Timeout details are still loading."
     */
    readonly toolCallTimeoutLoadingMessage?: string;

    /**
     * Message shown in the timeout modal when the scheduled time is unavailable.
     * @default "Scheduled time is unavailable."
     */
    readonly toolCallTimeoutUnavailableMessage?: string;

    /**
     * Label prefix for the due date line in the timeout modal (e.g. "Date: 1/1/2025").
     * @default "Date:"
     */
    readonly toolCallTimeoutDateLabel?: string;

    /**
     * Label prefix for the message line in the timeout modal.
     * @default "Message:"
     */
    readonly toolCallTimeoutMessageLabel?: string;

    /**
     * Label prefix for the timezone line in the timeout modal.
     * @default "Timezone:"
     */
    readonly toolCallTimeoutTimezoneLabel?: string;

    /**
     * Template used for timeout chips, for example `"Timeout: {time}"`.
     * @default "Timeout: {time}"
     */
    readonly toolCallTimeoutChipLabel?: string;

    /**
     * Chip text used when a timeout has been cancelled.
     * @default "Timeout cancelled"
     */
    readonly toolCallTimeoutChipCancelledLabel?: string;

    /**
     * Chip text used when a timeout is already inactive.
     * @default "Timeout inactive"
     */
    readonly toolCallTimeoutChipInactiveLabel?: string;

    /**
     * Chip text used when a timeout status update is received.
     * @default "Timeout update"
     */
    readonly toolCallTimeoutChipUpdatedLabel?: string;

    /**
     * Chip text used when no specific timeout time is available yet.
     * @default "Timeout scheduled"
     */
    readonly toolCallTimeoutChipFallbackLabel?: string;

    /**
     * Primary timeout summary template shown in the modal, for example `"Scheduled for {time}."`.
     * @default "Scheduled for {time}."
     */
    readonly toolCallTimeoutPrimaryScheduledLabel?: string;

    /**
     * Secondary timeout summary template shown in the modal, for example `"Will retry in {duration}."`.
     * @default "Will retry in {duration}."
     */
    readonly toolCallTimeoutSecondaryDurationLabel?: string;

    /**
     * Primary timeout summary shown after cancellation.
     * @default "The timeout has been cancelled."
     */
    readonly toolCallTimeoutPrimaryCancelledLabel?: string;

    /**
     * Primary timeout summary shown when the timeout is already inactive.
     * @default "This timeout was already inactive."
     */
    readonly toolCallTimeoutPrimaryInactiveLabel?: string;

    /**
     * Primary timeout summary shown for generic timeout updates.
     * @default "The timeout status has been updated."
     */
    readonly toolCallTimeoutPrimaryUpdatedLabel?: string;

    /**
     * Primary timeout summary shown when only limited data is available.
     * @default "The timeout has been scheduled."
     */
    readonly toolCallTimeoutPrimaryFallbackLabel?: string;

    /**
     * Accessible label for the timeout quick-action button group.
     * @default "Timeout quick actions"
     */
    readonly toolCallTimeoutActionGroupLabel?: string;

    /**
     * Accessible label for the "Cancel" timeout quick action.
     * @default "Cancel timeout"
     */
    readonly toolCallTimeoutCancelAriaLabel?: string;

    /**
     * Accessible label for the "Snooze" timeout quick action.
     * @default "Snooze timeout"
     */
    readonly toolCallTimeoutSnoozeAriaLabel?: string;

    /**
     * Accessible label for the "View advanced" timeout quick action.
     * @default "View advanced timeout details"
     */
    readonly toolCallTimeoutViewAdvancedAriaLabel?: string;

    // ── Time tool-call modal ─────────────────────────────────────────────────

    /**
     * Header title shown in the time-check modal.
     * @default "Time at call"
     */
    readonly toolCallTimeTitle?: string;

    /**
     * Shown in the time modal when the time value is unknown.
     * @default "Unknown time"
     */
    readonly toolCallTimeUnknown?: string;

    /**
     * Label prefix for the exact timestamp line in the time modal.
     * @default "Timestamp of call:"
     */
    readonly toolCallTimeTimestampLabel?: string;

    /**
     * Template used for the time chip, for example `"Time: {time}"`.
     * @default "{time}"
     */
    readonly toolCallTimeChipLabel?: string;

    /**
     * Template shown under the time clock panel for relative context.
     * @default "Called {relative}"
     */
    readonly toolCallTimeRelativeLabel?: string;
};

/**
 * Optional text overrides for localized timing metadata rendered next to message timestamps.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatTimingTranslations = {
    /**
     * Template used for assistant response duration metadata.
     *
     * The `{duration}` placeholder is replaced with the compact duration label.
     */
    readonly answerDurationLabel?: string;
};

/**
 * Interface for sound system that can be passed to Chat component
 * This allows the chat to trigger sounds without tight coupling
 *
 * @public exported from `@promptbook/components`
 */
export type ChatSoundSystem = {
    /**
     * @@@
     */
    play(event: string): Promise<void>;
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    toggle(): boolean;
    /**
     * Optional helpers for haptic vibration state.
     */
    isVibrationEnabled?(): boolean;
    setVibrationEnabled?(enabled: boolean): void;
    toggleVibration?(): boolean;
    /**
     * Optional vibration helper to stay in sync with sound events.
     */
    vibrate?(event: string): void;
};

/**
 * Supported primary Enter-key behaviors for the chat composer.
 *
 * @private internal helper of `<Chat/>`
 */
type ChatEnterBehavior = 'SEND' | 'NEWLINE';

/**
 * Async resolver used when the host app wants to decide Enter behavior lazily.
 *
 * Returning `null` / `undefined` keeps the current composer text unchanged.
 *
 * @private internal helper of `<Chat/>`
 */
type ChatEnterBehaviorResolver = () => Promisable<ChatEnterBehavior | null | undefined>;

/**
 * Props for chat.
 *
 * @public exported from `@promptbook/components`
 */
export type ChatProps = {
    /**
     * Optional callback to create a new agent from the template.
     * If provided, renders the [Use this template] button.
     */
    onUseTemplate?(): void;

    /**
     * The title of the chat
     */
    readonly title?: string;

    /**
     * Messages to render - they are rendered as they are
     */
    readonly messages: ReadonlyArray<ChatMessage>;

    /**
     * Called every time the user types or dictated a message
     */
    onChange?(messageContent: string /* <- TODO: [🍗] Pass here the message object NOT just text */): void;
    // <- TODO: [🖱] `LlmChatProps.onChange` and `ChatProps.onChange` are not the same, unite them or distinct by name

    /**
     * Called when user sends a message
     *
     * Note: You must handle the message yourself and add it to the `messages` array
     *
     * - When set, the send textarea and button will be shown
     * - When undefined, the chat has no input and is read-only showing only the messages
     */
    onMessage?(
        messageContent: string /* <- TODO: [🍗] Pass here the message object NOT just text */,
        attachments?: Array<{ name: string; type: string; url: string }>,
        replyingToMessage?: ChatMessage | null,
    ): Promisable<void>;

    /**
     * Called when user clicks a quick action button parsed from message markdown.
     *
     * The callback is responsible for running the browser-side action and may reject
     * to keep the button available for another attempt.
     */
    onActionButton?(code: string): Promisable<void>;

    /**
     * Called when user clicks a quick message button parsed from message markdown.
     *
     * When not provided, quick message buttons fall back to `onMessage`.
     */
    onQuickMessageButton?(messageContent: string): Promisable<void>;

    /**
     * Optional callback fired when the user starts replying to one existing message.
     */
    onReplyToMessage?(message: ChatMessage): void;

    /**
     * Optional callback fired when the user cancels the currently composed reply.
     */
    onCancelReply?(): void;

    /**
     * Optional callback that determines whether one message can be replied to.
     */
    canReplyToMessage?(message: ChatMessage): boolean;

    /**
     * Optional message currently being quoted by the composer.
     */
    readonly replyingToMessage?: ChatMessage | null;

    /**
     * Optional callback
     *
     * - When set, button for resetting chat will be shown
     * - When undefined, no reset button will be shown
     */
    onReset?(): Promisable<void>;

    /**
     * Controls whether the reset button asks for native browser confirmation before calling `onReset`.
     *
     * @default true
     */
    readonly resetRequiresConfirmation?: boolean;

    /**
     * Optional navigation target for the action-bar "New chat" control.
     *
     * When provided, the control is rendered as a plain link instead of invoking `onReset`.
     * This allows host applications to rely on browser-native navigation affordances such as
     * right-click "Open in new tab/window".
     */
    readonly newChatButtonHref?: string_href;

    /**
     * Determines whether the voice recognition button is rendered
     */
    readonly isVoiceRecognitionButtonShown?: boolean;

    /**
     * Speech recognition provider
     */
    readonly speechRecognition?: SpeechRecognition;

    /**
     * Optional language tag (BCP 47) to force speech recognition to use a specific language.
     * When not provided, the browser preferences are used with a fallback to `en-US`.
     */
    readonly speechRecognitionLanguage?: string;

    /**
     * Controls whether message audio playback is available.
     *
     * When `false`, the ElevenLabs play/pause controls are hidden and no TTS requests are initiated.
     *
     * @default true
     */
    readonly isSpeechPlaybackEnabled?: boolean;

    /**
     * Optional ElevenLabs voice ID that should be used when reading messages aloud.
     * When not provided, the server uses the default configured voice.
     */
    readonly elevenLabsVoiceId?: string;

    /**
     * Optional placeholder message for the textarea
     *
     * @default "Write a message"
     */
    readonly placeholderMessageContent?: string;

    /**
     * Optional preset message in chat
     */
    readonly defaultMessage?: string;

    /**
     * Determines which action the plain `Enter` key triggers in the composer.
     *
     * `Ctrl+Enter` automatically performs the inverse action.
     * `Shift+Enter` always inserts a new line.
     *
     * @default 'SEND'
     */
    readonly enterBehavior?: ChatEnterBehavior;

    /**
     * Optional async hook used when `enterBehavior` is not known yet.
     *
     * It is invoked after the user presses plain `Enter` and can resolve to the
     * preferred behavior without coupling `<Chat/>` to any specific persistence UI.
     *
     * Returning `null` / `undefined` leaves the text unchanged.
     */
    readonly resolveEnterBehavior?: ChatEnterBehaviorResolver;

    /**
     * List of tasks that are currently in progress that should be displayed
     */
    readonly tasksProgress?: Array<{ id: string; name: string; progress?: number }>; // Simplified task progress type

    /**
     * Content to be shown inside the chat bar in head
     * If not provided, the chat bar will not be rendered
     */
    readonly children?: ReactNode;

    /**
     * Extra action buttons/elements rendered in the actions toolbar
     * (next to reset / template buttons). Keeps consumers DRY when
     * adding feature–specific controls (e.g. Pause / Resume in MockedChat).
     */
    readonly extraActions?: ReactNode;

    /**
     * Optional container to render the actions into (using React Portal).
     * If provided, the actions toolbar will be rendered inside this element
     * instead of its default position within the chat.
     */
    readonly actionsContainer?: HTMLElement | null;

    /**
     * Color of the action buttons (send, reset, voice, etc.)
     */
    readonly buttonColor?: string_color | Color;

    /**
     * Optional CSS class name which will be added to root <div/> element
     */
    readonly className?: string;

    /**
     * Optional CSS style which will be added to root <div/> element
     */
    readonly style?: CSSProperties;

    /**
     * Voice call props - when provided, voice call button will be shown
     */
    readonly voiceCallProps?: {
        selectedModel: string;
        providerClients: Map<string, unknown>;
        currentPersonaContent?: string;
        onVoiceMessage?: (content: string, isVoiceCall: boolean) => void;
        onAssistantVoiceResponse?: (content: string, isVoiceCall: boolean) => void;
        onVoiceCallStateChange?: (isVoiceCalling: boolean) => void;
    };

    /**
     * Indicates whether a voice call is currently active
     */
    readonly isVoiceCalling?: boolean;

    /**
     * Whether experimental features are enabled (required for voice calling)
     */
    readonly isExperimental?: boolean;

    /**
     * Whether the save button is enabled and shown
     */
    readonly isSaveButtonEnabled?: boolean;

    /**
     * List of formats in which the chat can be saved/exported
     *
     * @default * All supported formats (see `string_chat_format_name` type)
     */
    readonly saveFormats?: Array<string_chat_format_name>;

    /**
     * Is the writing textarea automatically focused?
     *
     * @default true on Desktop false on mobile (to prevent mobile keyboard from popping up)
     */
    readonly isFocusedOnLoad?: boolean;

    /**
     * Indicates whether the text shown in chat should be post-processed by removing AI artifacts and making it more "human-like" and "promptbook-like"
     *
     * @default true
     */
    readonly isAiTextHumanizedAndPromptbookified?: boolean;

    /**
     * Optional markdown header to include at the top of exported files.
     * Example: "## Discussion Topic\n\nSome topic here"
     */
    readonly exportHeaderMarkdown?: string;

    /**
     * Optional mapping of participant IDs (message.from) to display metadata for exports.
     * Keys should match ChatMessage.from values (e.g., 'USER', 'AGENT_{id}', etc.)
     */
    readonly participants?: ReadonlyArray<ChatParticipant>;

    /**
     * Optional mapping of technical tool names to human-readable titles.
     * e.g., { "web_search": "Searching the web..." }
     */
    readonly toolTitles?: Record<string, string>;

    /**
     * Optional metadata about teammates for team tool calls
     * Maps tool name to agent information
     */
    readonly teammates?: Record<
        string,
        {
            url: string;
            label?: string;
            instructions?: string;
            toolName: string;
        }
    >;

    /**
     * Optional cached agent metadata keyed by TEAM tool names to improve chip rendering.
     */
    readonly teamAgentProfiles?: Record<string, AgentChipData>;

    /**
     * Optional callback to create a new agent from the template.
     * If provided, renders the [Create Agent] button for book code blocks.
     */
    onCreateAgent?: (bookContent: string) => void;

    /**
     * Optional callback for handling user feedback on messages
     * When provided, message feedback actions are displayed according to `feedbackMode`.
     *
     * @param feedback - Object containing the feedback data
     * @param feedback.message - The message being rated
     * @param feedback.rating - Numeric feedback rating value
     * @param feedback.textRating - Optional text feedback/note from user
     * @param feedback.chatThread - Complete chat thread as string
     * @param feedback.expectedAnswer - Optional expected answer provided by user
     * @param feedback.url - Current page URL where feedback was given
     */
    onFeedback?(feedback: {
        message: ChatMessage;
        rating: number;
        textRating: string;
        chatThread: string;
        expectedAnswer: string | null;
        url: string;
    }): Promisable<void>;

    /**
     * Selects which feedback action UI is shown on assistant responses.
     *
     * @default 'stars'
     */
    readonly feedbackMode?: ChatFeedbackMode;

    /**
     * Optional localized feedback labels for buttons, modal copy, and status toasts.
     */
    readonly feedbackTranslations?: ChatFeedbackTranslations;

    /**
     * Optional localized labels used by timestamp metadata shown under messages.
     */
    readonly timingTranslations?: ChatTimingTranslations;

    /**
     * Optional localized labels for general Chat UI elements such as button labels,
     * lifecycle state badges, tool call modal strings, and the default input placeholder.
     */
    readonly chatUiTranslations?: ChatUiTranslations;

    /**
     * Optional moment locale used when formatting message timestamps.
     *
     * When omitted, the current global moment locale is used.
     */
    readonly chatLocale?: string;

    /**
     * Optional callback for handling file uploads
     * When provided, enables file upload functionality via drag-and-drop and file button
     * The callback should process the file and return text content to be inserted into the message
     *
     * @param file - The uploaded file
     * @returns Promise or string with the text content to insert into the chat message
     */
    onFileUpload?(file: File): Promisable<string>;

    /**
     * Enables the copy button for each message bubble.
     * When true, a copy button appears in the top-right of each message.
     * @default true
     */
    isCopyButtonEnabled?: boolean;

    /**
     * Called when a tool call chiplet is clicked.
     */
    onToolCallClick?: (toolCall: NonNullable<ChatMessage['toolCalls']>[number]) => void;

    /**
     * Visual presentation mode for chat messages.
     *
     * - `BUBBLE_MODE`: keeps the default bubble appearance for all messages.
     * - `ARTICLE_MODE`: keeps user bubbles while rendering assistant replies as borderless article blocks.
     *
     * @default 'ARTICLE_MODE'
     */
    readonly visualMode?: ChatVisualMode;

    /**
     * Resolved visual theme used for chat surfaces, modals, and embedded Monaco viewers.
     *
     * Host applications should pass the final light/dark theme here instead of leaving
     * `<Chat/>` to infer anything from the document.
     *
     * @default 'LIGHT'
     */
    readonly theme?: 'LIGHT' | 'DARK';

    /**
     * Layout of the chat component
     */
    readonly layout: 'STANDALONE' | 'FULL_PAGE';

    /**
     * Optional array of effect configurations for chat animations
     * When provided, enables visual effects (confetti, hearts, etc.) based on emojis in messages
     *
     * Example:
     * ```typescript
     * [
     *   { trigger: '🎉', effectType: 'CONFETTI' },
     *   { trigger: /❤️|💙|💚/, effectType: 'HEARTS' }
     * ]
     * ```
     */
    readonly effectConfigs?: ReadonlyArray<{ trigger: string | RegExp; effectType: string }>;

    /**
     * Optional sound system for playing chat sounds
     * When provided, enables sound effects for message events, button clicks, and visual effects
     *
     * The sound system should implement the ChatSoundSystem interface:
     * - play(event: string): Plays a sound for the given event
     * - isEnabled(): Returns whether sounds are enabled
     * - setEnabled(enabled: boolean): Enables or disables sounds
     * - toggle(): Toggles sound on/off and returns the new state
     *
     * Supported events:
     * - 'message_send': When user sends a message
     * - 'message_receive': When agent sends a message
     * - 'message_typing': When agent is typing/thinking
     * - 'button_click': When any button is clicked
     * - 'effect_confetti': When confetti effect is triggered
     * - 'effect_hearts': When hearts effect is triggered
     *
     * @example
     * ```typescript
     * import { createDefaultSoundSystem } from '@/utils/sound/createDefaultSoundSystem';
     *
     * const soundSystem = createDefaultSoundSystem();
     * <Chat soundSystem={soundSystem} ... />
     * ```
     */
    readonly soundSystem?: ChatSoundSystem;
};

// TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)

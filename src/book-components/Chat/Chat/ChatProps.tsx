'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import type { ComponentType, CSSProperties, ReactNode } from 'react';
import type { Promisable } from 'type-fest';
import { Color } from '../../../_packages/color.index';
import { SpeechRecognition } from '../../../types/SpeechRecognition';
import { string_color } from '../../../types/typeAliases';
import type { string_chat_format_name } from '../save/_common/string_chat_format_name';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';

/**
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
    onMessage?(messageContent: string /* <- TODO: [🍗] Pass here the message object NOT just text */): Promisable<void>;

    /**
     * Optional callback
     *
     * - When set, button for resetting chat will be shown
     * - When undefined, no reset button will be shown
     */
    onReset?(): Promisable<void>;

    /**
     * Determines whether the voice recognition button is rendered
     */
    readonly isVoiceRecognitionButtonShown?: boolean;

    /**
     * Speech recognition provider
     */
    readonly speechRecognition?: SpeechRecognition;

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
     * adding feature-specific controls (e.g. Pause / Resume in MockedChat).
     */
    readonly extraActions?: ReactNode;

    /**
     * Optional container to render the actions into (using React Portal).
     * If provided, the actions toolbar will be rendered inside this element
     * instead of its default position within the chat.
     */
    readonly actionsContainer?: HTMLElement | null;

    /**
     * Optional effects system rendered inside the chat container.
     * Receives the current messages and participants for triggering effects.
     */
    readonly EffectsSystem?: ComponentType<{
        messages: ReadonlyArray<ChatMessage>;
        participants?: ReadonlyArray<ChatParticipant>;
    }>;

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
     * Optional callback to create a new agent from the template.
     * If provided, renders the [Create Agent] button for book code blocks.
     */
    onCreateAgent?: (bookContent: string) => void;

    /**
     * Optional callback for handling user feedback on messages
     * When provided, star rating buttons (1-5 stars) will be displayed next to each message
     *
     * @param feedback - Object containing the feedback data
     * @param feedback.message - The message being rated
     * @param feedback.rating - Star rating from 1 to 5
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
     * Visual style of the chat component
     */
    readonly visual: 'STANDALONE' | 'FULL_PAGE';
};

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 */

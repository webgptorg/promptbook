'use client';
import type { CSSProperties, ReactNode } from 'react';
import type { Promisable } from 'type-fest';
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
     * Messages to render - they are rendered as they are
     */
    readonly messages: ReadonlyArray<ChatMessage>;

    /**
     * Called every time the user types or dictated a message
     */
    onChange?(messageContent: string /* <- TODO: [🍗] Pass here the message object NOT just text */): void;
    // <- TODO: [🖱] `LlmChatProps.onChange` and `ChatProps.onChange` arent the same, unite them or distinct by name

    /**
     * Called when user sends a message
     *
     * Note: You must handle the message yourself and add it to the `messages` array
     */
    onMessage(messageContent: string /* <- TODO: [🍗] Pass here the message object NOT just text */): Promisable<void>;

    /**
     * Optional callback, when set, button for resetting chat will be shown
     */
    onReset?(): Promisable<void>;

    /**
     * Determines whether the voice recognition button is rendered
     */
    readonly isVoiceRecognitionButtonShown?: boolean;

    /**
     * The language code to use for voice recognition
     */
    readonly voiceLanguage?: string;

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
     * Optional markdown header to include at the top of exported files.
     * Example: "## Discussion Topic\n\nSome topic here"
     */
    readonly exportHeaderMarkdown?: string;

    /**
     * Optional mapping of participant IDs (message.from) to display metadata for exports.
     * Keys should match ChatMessage.from values (e.g., 'USER', 'AGENT_{id}', etc.)
     */
    readonly participants?: ReadonlyArray<ChatParticipant>;
};

export type ChatMessage = UserChatMessage | PromptbookPersonaChatMessage /* <- TODO: Extract commons */;

export interface UserChatMessage {
    id: string;
    date: Date /* <- TODO: Rename+split into created+modified */;
    from: 'USER';
    content: string /*_markdown*/;
    isComplete: boolean;
    expectedAnswer?: string;
    isVoiceCall?: boolean;
}

export interface PromptbookPersonaChatMessage {
    id: string;
    // TODO: gptMessageId: string;
    date: Date /* <- TODO: Rename+split into created+modified */;
    from: 'PROMPTBOOK_PERSONA';
    avatar?: string | { src: string; width?: number; height?: number }; // Simplified StaticImageData type
    content: string /*_markdown*/;
    isComplete: boolean;
    expectedAnswer?: string;
    isVoiceCall?: boolean;
}

export interface CompleteChatMessage {
    isComplete: true;
}

/**
 * TODO: [🧠] ACRY Rename PROMPTBOOK_PERSONA + USER, Teacher, teacher to sth else
 */

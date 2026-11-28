'use client';

/**
 * Internal representation of an uploaded file in the chat input.
 *
 * @private type of `<ChatInputArea/>`
 */
export type ChatInputUploadedFile = {
    readonly id: string;
    readonly file: File;
    readonly content: string;
};

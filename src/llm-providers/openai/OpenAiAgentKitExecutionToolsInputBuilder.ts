import type { Prompt } from '../../types/Prompt';
import type { ChatAttachment } from '../../utils/chat/chatAttachments';
import { normalizeChatAttachments } from '../../utils/chat/chatAttachments/normalizeChatAttachments';
import type { TODO_any } from '../../utils/organization/TODO_any';

/**
 * File extensions considered image inputs when MIME type is missing or generic.
 */
const IMAGE_ATTACHMENT_EXTENSIONS = new Set<string>([
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'bmp',
    'svg',
    'heic',
    'heif',
    'avif',
    'tif',
    'tiff',
]);

/**
 * Builds AgentKit input items, including multimodal attachments.
 *
 * @private helper of `OpenAiAgentKitExecutionTools`
 */
export class OpenAiAgentKitExecutionToolsInputBuilder {
    /**
     * Builds AgentKit input items from the prompt and optional thread.
     */
    public async buildAgentKitInputItems(prompt: Prompt, rawPromptContent: string): Promise<Array<TODO_any>> {
        const inputItems: Array<TODO_any> = [];

        if ('thread' in prompt && Array.isArray(prompt.thread)) {
            for (const message of prompt.thread) {
                const sender = (message as TODO_any).sender;
                const content = (message as TODO_any).content ?? '';

                if (sender === 'assistant' || sender === 'agent') {
                    inputItems.push({
                        role: 'assistant',
                        status: 'completed',
                        content: [{ type: 'output_text', text: content }],
                    });
                } else {
                    const userThreadContent = await this.buildAgentKitUserContentWithAttachments({
                        textContent: typeof content === 'string' ? content : String(content ?? ''),
                        rawAttachments: (message as { attachments?: unknown }).attachments,
                    });

                    inputItems.push({
                        role: 'user',
                        content: userThreadContent,
                    });
                }
            }
        }

        const userContent = await this.buildAgentKitUserContent(prompt, rawPromptContent);
        inputItems.push({
            role: 'user',
            content: userContent,
        });

        return inputItems;
    }

    /**
     * Builds the user message content for AgentKit runs, including file inputs when provided.
     */
    private async buildAgentKitUserContent(prompt: Prompt, rawPromptContent: string): Promise<TODO_any> {
        const files = 'files' in prompt && Array.isArray(prompt.files) ? prompt.files : undefined;
        const rawAttachments = 'attachments' in prompt ? prompt.attachments : undefined;

        return this.buildAgentKitUserContentWithAttachments({
            textContent: rawPromptContent,
            rawAttachments,
            files,
        });
    }

    /**
     * Converts uploaded `File` objects into AgentKit `input_image` entries.
     */
    private async createAgentKitInputImageItemsFromFiles(files: ReadonlyArray<File>): Promise<Array<TODO_any>> {
        return Promise.all(
            files.map(async (file: File) => {
                const arrayBuffer = await file.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');
                return {
                    type: 'input_image',
                    image: `data:${file.type};base64,${base64}`,
                };
            }),
        );
    }

    /**
     * Converts image chat attachments into AgentKit `input_image` entries.
     */
    private createAgentKitInputImageItemsFromAttachments(rawAttachments: unknown): Array<TODO_any> {
        return normalizeChatAttachments(rawAttachments)
            .filter((attachment) => this.isImageAttachment(attachment))
            .map((attachment) => ({
                type: 'input_image',
                image: attachment.url,
            }));
    }

    /**
     * Builds AgentKit user content that can include text, uploaded files, and image attachments.
     */
    private async buildAgentKitUserContentWithAttachments(options: {
        readonly textContent: string;
        readonly rawAttachments?: unknown;
        readonly files?: ReadonlyArray<File>;
    }): Promise<TODO_any> {
        const { textContent, rawAttachments, files } = options;
        const contentItems: Array<TODO_any> = [];

        if (textContent.trim() !== '') {
            contentItems.push({
                type: 'input_text',
                text: textContent,
            });
        }

        contentItems.push(...this.createAgentKitInputImageItemsFromAttachments(rawAttachments));

        if (files && files.length > 0) {
            contentItems.push(...(await this.createAgentKitInputImageItemsFromFiles(files)));
        }

        if (contentItems.length === 0) {
            return textContent;
        }

        if (contentItems.length === 1 && contentItems[0]?.type === 'input_text') {
            return textContent;
        }

        return contentItems;
    }

    /**
     * Checks whether one chat attachment can be sent as an image input.
     */
    private isImageAttachment(attachment: ChatAttachment): boolean {
        const normalizedType = attachment.type.trim().toLowerCase();
        if (normalizedType.startsWith('image/')) {
            return true;
        }

        const extension =
            this.getLowercaseFilenameExtension(attachment.name) || this.getUrlPathnameExtension(attachment.url);

        return extension ? IMAGE_ATTACHMENT_EXTENSIONS.has(extension) : false;
    }

    /**
     * Returns one lowercase extension extracted from a filename/pathname.
     */
    private getLowercaseFilenameExtension(filename: string): string | null {
        const normalizedFilename = filename.trim().toLowerCase();
        const queryStart = normalizedFilename.indexOf('?');
        const hashStart = normalizedFilename.indexOf('#');
        const suffixStart =
            queryStart === -1 && hashStart === -1
                ? normalizedFilename.length
                : Math.min(
                      queryStart === -1 ? normalizedFilename.length : queryStart,
                      hashStart === -1 ? normalizedFilename.length : hashStart,
                  );
        const pathname = normalizedFilename.slice(0, suffixStart);
        const lastDotIndex = pathname.lastIndexOf('.');

        if (lastDotIndex <= 0 || lastDotIndex === pathname.length - 1) {
            return null;
        }

        return pathname.slice(lastDotIndex + 1);
    }

    /**
     * Tries to extract one extension from URL pathname.
     */
    private getUrlPathnameExtension(url: string): string | null {
        try {
            const parsedUrl = new URL(url);
            return this.getLowercaseFilenameExtension(decodeURIComponent(parsedUrl.pathname));
        } catch {
            return null;
        }
    }
}

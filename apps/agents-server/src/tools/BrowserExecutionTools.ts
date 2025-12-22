import type { LlmExecutionTools, ChatPromptResult, Prompt, AvailableModel, TODO_any } from '@promptbook-local/types';
import { $provideBrowserForServer } from './$provideBrowserForServer';

/**
 * Execution tools that add browser automation capabilities by intercepting JSON actions
 */
export class BrowserExecutionTools implements LlmExecutionTools {
    constructor(private readonly child: LlmExecutionTools) {}

    get title() {
        return this.child.title;
    }

    get description() {
        return this.child.description;
    }

    checkConfiguration() {
        return this.child.checkConfiguration();
    }

    async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        return this.child.listModels();
    }

    async callChatModel(prompt: Prompt): Promise<ChatPromptResult> {
        return this.callChatModelStream(prompt, () => {});
    }

    async callChatModelStream(
        prompt: Prompt,
        onProgress: (chunk: ChatPromptResult) => void,
    ): Promise<ChatPromptResult> {
        let currentPrompt = prompt;
        const maxIterations = 10;
        let iteration = 0;

        if (!this.child.callChatModelStream) {
            throw new Error('Child tools do not support streaming');
        }

        while (iteration < maxIterations) {
            iteration++;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const result = await this.child.callChatModelStream!(currentPrompt, onProgress);
            const content = result.content;

            // Check for JSON action
            const actionJson = this.extractActionJson(content);

            if (!actionJson) {
                return result;
            }

            // Execute action
            const actionResult = await this.executeBrowserAction(actionJson);

            // Append result to prompt and continue loop
            // We need to construct a new prompt with history
            
            // Assuming prompt has a 'thread' property or we append to 'content' if it's a single turn?
            // In handleChatCompletion, prompt.thread is constructed.
            // If prompt is ChatPrompt, it has thread.
            
            // We need to extend the thread with:
            // 1. Assistant message (the action request)
            // 2. System/User message (the execution result)

            const previousThread = (currentPrompt as TODO_any).thread || [];
            const newThread = [
                ...previousThread,
                { role: 'user', content: currentPrompt.content }, // The user message that triggered this response
                { role: 'assistant', content: content }, // The assistant's JSON response
            ];

            // The next user message is the result
            const nextUserMessage = `Browser Action Result:\n${JSON.stringify(actionResult, null, 2)}`;

            currentPrompt = {
                ...currentPrompt,
                content: nextUserMessage,
                thread: newThread,
            } as TODO_any; 

            // Report progress?
            // maybe send a chunk saying "Action executed"
        }

        throw new Error(`Browser execution exceeded max iterations (${maxIterations})`);
    }

    private extractActionJson(content: string): TODO_any | null {
        // Look for ```json ... ``` block
        const match = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed.actions && Array.isArray(parsed.actions)) {
                    return parsed;
                }
            } catch (e) {
                // Invalid JSON
            }
        }
        
        // Also try parsing the whole content if it looks like JSON
        if (content.trim().startsWith('{')) {
             try {
                const parsed = JSON.parse(content);
                if (parsed.actions && Array.isArray(parsed.actions)) {
                    return parsed;
                }
            } catch (e) {}
        }

        return null;
    }

    private async executeBrowserAction(actionJson: { actions: TODO_any[] }): Promise<TODO_any> {
        const browserContext = await $provideBrowserForServer();
        const pages = browserContext.pages();
        let page = pages[0];

        if (!page) {
            page = await browserContext.newPage();
        }

        const results = [];

        for (const act of actionJson.actions) {
            console.log('Executing browser action:', act);
            try {
                if (act.type === 'click') {
                    if (act.selector) {
                        await page.waitForSelector(act.selector, { timeout: 2000 });
                        await page.click(act.selector);
                    }
                } else if (act.type === 'type') {
                    if (act.selector && act.text) {
                        await page.waitForSelector(act.selector, { timeout: 2000 });
                        await page.type(act.selector, act.text);
                    }
                } else if (act.type === 'scroll') {
                    await page.evaluate((y) => window.scrollBy(0, y), act.amount || 500);
                } else if (act.type === 'wait') {
                    await page.waitForTimeout(act.ms || 1000);
                } else if (act.type === 'navigate') {
                    if (act.url) await page.goto(act.url);
                }
                
                // Always get page text content after action to provide context
                const pageText = await page.evaluate(() => document.body.innerText.slice(0, 5000));
                results.push({ action: act, status: 'success', pageTextSnippet: pageText });

            } catch (error) {
                console.error('Action failed:', act, error);
                results.push({ action: act, status: 'error', error: String(error) });
            }
            await page.waitForTimeout(500);
        }

        return { results };
    }
}

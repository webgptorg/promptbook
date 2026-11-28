import { describe, expect, it } from '@jest/globals';
import { reactSaveFormatDefinition } from './reactSaveFormatDefinition';

describe('reactSaveFormatDefinition', () => {
    it('should export React chat code even when chat metadata contains undefined values', () => {
        const exportedContent = reactSaveFormatDefinition.getContent({
            title: 'Support "Demo"',
            participants: [
                {
                    name: 'USER',
                    fullname: undefined,
                    color: '#ff00ff',
                },
            ],
            messages: [
                {
                    id: 'message-1',
                    sender: 'USER',
                    content: 'Hello from chat export.',
                    createdAt: undefined,
                    isComplete: true,
                    toolCalls: [
                        {
                            name: 'lookup',
                            arguments: {},
                            result: {
                                details: undefined,
                            },
                        },
                    ],
                },
            ],
        }) as string;

        expect(exportedContent).toContain('Exported with Promptbook.');
        expect(exportedContent).toContain('Promptbook engine version');
        expect(exportedContent).toContain('Book language version');
        expect(exportedContent).toContain('title={');
        expect(exportedContent).toContain('"Support \\"Demo\\""');
        expect(exportedContent).toMatch(/"createdAt":\s+undefined/);
        expect(exportedContent).toMatch(/"details":\s+undefined/);
    });
});

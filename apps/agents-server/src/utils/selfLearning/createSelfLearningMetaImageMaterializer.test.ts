import { afterEach, describe, expect, it, jest } from '@jest/globals';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { prepareAgentDefaultAvatarMaterialization } from '../imageGeneration/prepareAgentDefaultAvatarMaterialization';
import { createSelfLearningMetaImageMaterializer } from './createSelfLearningMetaImageMaterializer';

jest.mock('../imageGeneration/prepareAgentDefaultAvatarMaterialization', () => ({
    prepareAgentDefaultAvatarMaterialization: jest.fn(),
}));

describe('createSelfLearningMetaImageMaterializer', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('skips materialization for closed agents without META IMAGE', async () => {
        const materializer = createSelfLearningMetaImageMaterializer();
        const applyAgentSourceUpdate = jest.fn(async () => undefined);

        const result = await materializer({
            getAgentSource: () =>
                `
                    Closed Agent

                    PERSONA Friendly.
                    CLOSED
                ` as string_book,
            applyAgentSourceUpdate,
        });

        expect(result).toBeNull();
        expect(applyAgentSourceUpdate).not.toHaveBeenCalled();
        expect(prepareAgentDefaultAvatarMaterialization).not.toHaveBeenCalled();
    });

    it('materializes placeholder META IMAGE first and stores final image with derived colors later', async () => {
        let currentSource = `
            Open Agent

            PERSONA Friendly.
        ` as string_book;
        const applyCalls: Array<{ source: string_book; isFinal: boolean | undefined }> = [];
        let finalizePromiseResolve!: (result: { imageUrl: string; colors: ReadonlyArray<string> }) => void;
        const finalize = jest.fn(
            () =>
                new Promise<{ imageUrl: string; colors: ReadonlyArray<string> }>((resolve) => {
                    finalizePromiseResolve = resolve;
                }),
        );
        jest.mocked(prepareAgentDefaultAvatarMaterialization).mockResolvedValue({
            placeholderImageUrl: 'https://cdn.example.com/placeholder-avatar.png',
            finalize,
        });

        const materializer = createSelfLearningMetaImageMaterializer();
        const result = await materializer({
            getAgentSource: () => currentSource,
            applyAgentSourceUpdate: async (source, options) => {
                currentSource = source;
                applyCalls.push({
                    source,
                    isFinal: options?.isFinal,
                });
            },
        });

        expect(result).not.toBeNull();
        expect(applyCalls).toHaveLength(1);
        expect(applyCalls[0]?.isFinal).toBe(false);
        expect(applyCalls[0]?.source).toContain('META IMAGE https://cdn.example.com/placeholder-avatar.png');

        finalizePromiseResolve({
            imageUrl: 'https://cdn.example.com/final-avatar.png',
            colors: ['#112233', '#445566'],
        });
        await result?.backgroundTask;

        expect(finalize).toHaveBeenCalledWith({ includeColors: true });
        expect(applyCalls).toHaveLength(2);
        expect(applyCalls[1]?.isFinal).toBe(true);
        expect(applyCalls[1]?.source).toContain('META IMAGE https://cdn.example.com/final-avatar.png');
        expect(applyCalls[1]?.source).toContain('META COLOR #112233, #445566');
    });
});

import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { prepareAgentDefaultAvatarMaterialization } from '../imageGeneration/prepareAgentDefaultAvatarMaterialization';
import { upsertSelfLearningMetaImageAndColor } from './upsertSelfLearningMetaImageAndColor';

/**
 * Determines whether the given agent source is currently closed to self-learning mutations.
 */
function isSelfLearningMaterializationClosed(agentSource: string_book): boolean {
    const parsedAgentSource = parseAgentSourceWithCommitments(agentSource);
    return parsedAgentSource.commitments.at(-1)?.type === 'CLOSED';
}

/**
 * Creates a self-learning hook that materializes `META IMAGE` into source and later persists final palette colors.
 */
export function createSelfLearningMetaImageMaterializer() {
    return async (options: {
        readonly getAgentSource: () => string_book;
        readonly applyAgentSourceUpdate: (
            source: string_book,
            updateOptions?: {
                readonly isFinal: boolean;
            },
        ) => Promise<void>;
    }): Promise<{
        readonly backgroundTask: Promise<void>;
    } | null> => {
        const currentSource = options.getAgentSource();
        const currentAgentProfile = parseAgentSource(currentSource);

        if (currentAgentProfile.meta.image || isSelfLearningMaterializationClosed(currentSource)) {
            return null;
        }

        const materialization = await prepareAgentDefaultAvatarMaterialization(currentSource);
        const sourceWithPlaceholder = upsertSelfLearningMetaImageAndColor(currentSource, {
            imageUrl: materialization.placeholderImageUrl,
            colors: null,
        });

        await options.applyAgentSourceUpdate(sourceWithPlaceholder, { isFinal: false });

        return {
            backgroundTask: (async () => {
                try {
                    const finalizedAvatar = await materialization.finalize({ includeColors: true });
                    const finalizedSource = upsertSelfLearningMetaImageAndColor(options.getAgentSource(), {
                        imageUrl: finalizedAvatar.imageUrl,
                        colors: finalizedAvatar.colors || null,
                    });

                    await options.applyAgentSourceUpdate(finalizedSource, { isFinal: true });
                } catch (error) {
                    console.error('[self-learning] Failed to materialize META IMAGE', error);
                    await options.applyAgentSourceUpdate(currentSource, { isFinal: true });
                }
            })(),
        };
    };
}

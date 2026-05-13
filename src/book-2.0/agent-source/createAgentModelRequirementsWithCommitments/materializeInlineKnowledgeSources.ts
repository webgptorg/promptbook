import type { InlineKnowledgeSourceFile, InlineKnowledgeSourceUploader } from '../../../utils/knowledge/inlineKnowledgeSource';
import { inlineKnowledgeSourceToDataUrl } from '../../../utils/knowledge/inlineKnowledgeSource';
import type { chococake } from '../../../utils/organization/really_any';
import type { AgentModelRequirements } from '../AgentModelRequirements';

/**
 * Converts staged inline knowledge files into the final knowledge source URLs stored on requirements.
 *
 * @param requirements - Current requirements snapshot.
 * @param uploader - Optional uploader for inline knowledge files.
 * @returns Requirements with inline knowledge converted into upload URLs or data URLs.
 *
 * @private function of `createAgentModelRequirementsWithCommitments`
 */
export async function materializeInlineKnowledgeSources(
    requirements: AgentModelRequirements,
    uploader?: InlineKnowledgeSourceUploader,
): Promise<AgentModelRequirements> {
    const inlineSources = extractInlineKnowledgeSources(requirements._metadata);
    if (inlineSources.length === 0) {
        return requirements;
    }

    const knowledgeSources = [...(requirements.knowledgeSources ?? [])];

    for (const inlineSource of inlineSources) {
        const url = uploader
            ? await uploadInlineKnowledgeSourceWithFallback(inlineSource, uploader)
            : inlineKnowledgeSourceToDataUrl(inlineSource);
        knowledgeSources.push(url);
    }

    return {
        ...requirements,
        knowledgeSources,
        _metadata: stripInlineKnowledgeMetadata(requirements._metadata),
    };
}

/**
 * Uploads one inline knowledge source and falls back to a data URL when the upload fails.
 *
 * @param inlineSource - Inline knowledge file waiting for upload.
 * @param uploader - Upload implementation provided by the caller.
 * @returns Uploaded knowledge URL or a legacy data URL fallback.
 *
 * @private internal utility of `materializeInlineKnowledgeSources`
 */
async function uploadInlineKnowledgeSourceWithFallback(
    inlineSource: InlineKnowledgeSourceFile,
    uploader: InlineKnowledgeSourceUploader,
): Promise<string> {
    try {
        return await uploader(inlineSource);
    } catch (error) {
        console.error('[inline-knowledge] Failed to upload inline source', {
            filename: inlineSource.filename,
            error,
        });
        return inlineKnowledgeSourceToDataUrl(inlineSource);
    }
}

/**
 * Extracts inline knowledge sources cached in commitment metadata.
 *
 * @param metadata - Current requirements metadata.
 * @returns Inline knowledge files collected during commitment application.
 *
 * @private internal utility of `materializeInlineKnowledgeSources`
 */
function extractInlineKnowledgeSources(metadata?: Record<string, chococake>): InlineKnowledgeSourceFile[] {
    if (!metadata) {
        return [];
    }

    const value = metadata.inlineKnowledgeSources;
    return Array.isArray(value) ? (value as InlineKnowledgeSourceFile[]) : [];
}

/**
 * Removes inline-knowledge staging metadata after it has been materialized into final knowledge source URLs.
 *
 * @param metadata - Current requirements metadata.
 * @returns Metadata without the temporary inline knowledge staging field.
 *
 * @private internal utility of `materializeInlineKnowledgeSources`
 */
function stripInlineKnowledgeMetadata(metadata?: Record<string, chococake>): Record<string, chococake> | undefined {
    if (!metadata || !Object.prototype.hasOwnProperty.call(metadata, 'inlineKnowledgeSources')) {
        return metadata;
    }

    const { inlineKnowledgeSources: _unusedInlineKnowledgeSources, ...rest } = metadata;
    void _unusedInlineKnowledgeSources;
    return Object.keys(rest).length > 0 ? (rest as Record<string, chococake>) : undefined;
}

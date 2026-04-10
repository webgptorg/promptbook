import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { computeHash } from '@promptbook-local/utils';
import type { AgentBasicInformation } from '@promptbook-local/types';
import { PipelineExecutionError } from '../../../../../src/errors/PipelineExecutionError';
import { getSingleLlmExecutionTools } from '../../../../../src/llm-providers/_multiple/getSingleLlmExecutionTools';
import type { ChatModelRequirements } from '../../../../../src/types/ModelRequirements';
import { spaceTrim } from 'spacetrim';
import {
    AGENT_DEFAULT_AVATAR_SEMANTIC_PROFILE_JSON_SCHEMA,
    AgentDefaultAvatarParametersSchema,
    createAgentDefaultAvatarFingerprint,
    createAgentDefaultAvatarParameters,
    parseAgentDefaultAvatarSemanticProfile,
    type AgentDefaultAvatarParameters,
} from './AgentDefaultAvatarParameters';
import { createAgentDefaultAvatarRepository } from './AgentDefaultAvatarRepository';
import { buildAgentDefaultAvatarPrompt } from './buildAgentDefaultAvatarPrompt';

/**
 * Default timeout for waiting on deterministic avatar parameters to appear in storage.
 */
const DEFAULT_TIMEOUT_MS = 1000 * 60;

/**
 * Default lock lifetime for one stage-1 deterministic avatar generation attempt.
 */
const DEFAULT_LOCK_TTL_MS = 1000 * 60 * 5;

/**
 * Default polling interval while another request is generating deterministic avatar parameters.
 */
const DEFAULT_WAIT_INTERVAL_MS = 1000;

/**
 * Input required to resolve or create the stored deterministic avatar parameters.
 */
export type ResolveAgentDefaultAvatarParametersOptions = {
    /**
     * Fully resolved server-side agent profile.
     */
    readonly agentProfile: AgentBasicInformation;

    /**
     * Fully resolved agent source/book.
     */
    readonly resolvedAgentSource: string;
};

/**
 * Resolved stored parameters plus the cache fingerprint used for ETag and persistence.
 */
export type ResolvedAgentDefaultAvatarParameters = {
    /**
     * Stable fingerprint of source hash plus schema/render versions.
     */
    readonly avatarFingerprint: string;

    /**
     * Stable hash of the resolved source.
     */
    readonly sourceHash: string;

    /**
     * Stored deterministic intermediate parameters.
     */
    readonly parameters: AgentDefaultAvatarParameters;
};

/**
 * Resolves cached deterministic avatar parameters or creates them through the explicit LLM stage.
 *
 * @param options - Resolved profile and source for the current agent.
 * @returns Cached or newly created stored parameters plus their fingerprint.
 */
export async function resolveAgentDefaultAvatarParameters(
    options: ResolveAgentDefaultAvatarParametersOptions,
): Promise<ResolvedAgentDefaultAvatarParameters> {
    const repository = createAgentDefaultAvatarRepository();
    const sourceHash = computeHash(options.resolvedAgentSource);
    const avatarFingerprint = createAgentDefaultAvatarFingerprint(sourceHash);
    const lockKey = `agent-default-avatar:${avatarFingerprint}`;
    const startedAt = Date.now();

    while (Date.now() - startedAt < DEFAULT_TIMEOUT_MS) {
        const existingRecord = await repository.loadByFingerprint(avatarFingerprint);
        if (existingRecord) {
            return {
                avatarFingerprint,
                sourceHash,
                parameters: AgentDefaultAvatarParametersSchema.parse(existingRecord.parameters),
            };
        }

        const lockExpiresAtIso = new Date(Date.now() + DEFAULT_LOCK_TTL_MS).toISOString();
        const isLockAcquired = await repository.tryAcquireGenerationLock(lockKey, lockExpiresAtIso);

        if (isLockAcquired) {
            try {
                const existingRecordAfterLock = await repository.loadByFingerprint(avatarFingerprint);
                if (existingRecordAfterLock) {
                    return {
                        avatarFingerprint,
                        sourceHash,
                        parameters: AgentDefaultAvatarParametersSchema.parse(existingRecordAfterLock.parameters),
                    };
                }

                const semanticProfile = await classifyAgentDefaultAvatarSemanticProfile(options);
                const parameters = createAgentDefaultAvatarParameters({
                    sourceHash,
                    semanticProfile,
                });

                await repository.insert({
                    agentFingerprint: avatarFingerprint,
                    agentPermanentId: options.agentProfile.permanentId || null,
                    sourceHash,
                    schemaVersion: parameters.schemaVersion,
                    renderVersion: parameters.renderVersion,
                    parameters,
                });

                return {
                    avatarFingerprint,
                    sourceHash,
                    parameters,
                };
            } finally {
                await repository.releaseGenerationLock(lockKey);
            }
        }

        await clearExpiredGenerationLock(repository, lockKey);
        await sleep(DEFAULT_WAIT_INTERVAL_MS);
    }

    throw new PipelineExecutionError(
        spaceTrim(`
            Timed out while waiting for deterministic default-avatar parameters.

            Fingerprint: \`${avatarFingerprint}\`
        `),
    );
}

/**
 * Calls the configured LLM once to classify the agent into a small semantic avatar profile.
 *
 * @param options - Resolved profile and source context.
 * @returns Validated semantic profile from the model.
 */
async function classifyAgentDefaultAvatarSemanticProfile(
    options: ResolveAgentDefaultAvatarParametersOptions,
) {
    const executionTools = await $provideExecutionToolsForServer();
    const llmTools = getSingleLlmExecutionTools(executionTools.llm);

    if (!llmTools.callChatModel) {
        throw new PipelineExecutionError(
            'Deterministic default-avatar generation requires a chat-capable language model configuration.',
        );
    }

    const responseFormat: NonNullable<ChatModelRequirements['responseFormat']> = {
        type: 'json_schema',
        json_schema: {
            name: 'agent_default_avatar_semantic_profile',
            strict: true,
            schema: AGENT_DEFAULT_AVATAR_SEMANTIC_PROFILE_JSON_SCHEMA,
        },
    } as NonNullable<ChatModelRequirements['responseFormat']>;

    const response = await llmTools.callChatModel({
        title: `Classify deterministic avatar for ${options.agentProfile.agentName || 'agent'}`,
        content: buildAgentDefaultAvatarPrompt({
            agentProfile: options.agentProfile,
            resolvedAgentSource: options.resolvedAgentSource,
        }),
        parameters: {},
        modelRequirements: {
            modelVariant: 'CHAT',
            temperature: 0,
            maxTokens: 220,
            responseFormat,
        },
    });

    if (!response.content) {
        throw new PipelineExecutionError(
            'The deterministic avatar classification model returned no content.',
        );
    }

    return parseAgentDefaultAvatarSemanticProfile(response.content);
}

/**
 * Clears a stale generation lock so another request can continue stage-1 generation.
 *
 * @param repository - Avatar repository coordinating persistence and locks.
 * @param lockKey - Lock key to inspect.
 */
async function clearExpiredGenerationLock(
    repository: ReturnType<typeof createAgentDefaultAvatarRepository>,
    lockKey: string,
): Promise<void> {
    const expiresAtIso = await repository.loadGenerationLockExpiration(lockKey);

    if (!expiresAtIso) {
        return;
    }

    if (new Date(expiresAtIso).getTime() > Date.now()) {
        return;
    }

    await repository.releaseGenerationLock(lockKey);
}

/**
 * Sleeps for the specified duration.
 *
 * @param milliseconds - Delay duration.
 */
async function sleep(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

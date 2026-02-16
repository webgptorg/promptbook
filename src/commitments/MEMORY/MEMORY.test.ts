import { afterEach, describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirementsWithCommitments } from '../../book-2.0/agent-source/createAgentModelRequirementsWithCommitments';
import type { string_book } from '../../book-2.0/agent-source/string_book';
import { MemoryCommitmentDefinition, setMemoryToolRuntimeAdapter, type MemoryToolRuntimeAdapter } from './MEMORY';
import { TOOL_RUNTIME_CONTEXT_ARGUMENT } from '../_common/toolRuntimeContext';

/**
 * Helper to parse JSON tool results.
 */
function parseJsonResult<TValue>(value: string): TValue {
    return JSON.parse(value) as TValue;
}

describe('MemoryCommitmentDefinition', () => {
    afterEach(() => {
        setMemoryToolRuntimeAdapter(null);
    });

    it('adds retrieve/store memory tools and system-message instructions', async () => {
        const agentSource = spaceTrim(`
            Memory Agent
            MEMORY
        `) as string_book;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'retrieve_user_memory',
            }),
        );
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'store_user_memory',
            }),
        );
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'update_user_memory',
            }),
        );
        expect(requirements.tools).toContainEqual(
            expect.objectContaining({
                name: 'delete_user_memory',
            }),
        );
        expect(requirements.systemMessage).toContain('retrieve_user_memory');
        expect(requirements.systemMessage).toContain('store_user_memory');
        expect(requirements.systemMessage).toContain('update_user_memory');
        expect(requirements.systemMessage).toContain('delete_user_memory');
    });

    it('adds optional MEMORY instructions into system message', async () => {
        const agentSource = spaceTrim(`
            Memory Agent
            MEMORY Remember only project-related preferences.
        `) as string_book;

        const requirements = await createAgentModelRequirementsWithCommitments(agentSource);

        expect(requirements.systemMessage).toContain('Memory instructions');
        expect(requirements.systemMessage).toContain('Remember only project-related preferences.');
    });

    it('returns disabled result when runtime context is missing', async () => {
        const commitment = new MemoryCommitmentDefinition();
        const functions = commitment.getToolFunctions();
        const retrieveMemory = functions.retrieve_user_memory!;

        const resultRaw = await retrieveMemory({});
        const result = parseJsonResult<{
            status: string;
            memories: unknown[];
        }>(resultRaw);

        expect(result.status).toBe('disabled');
        expect(result.memories).toEqual([]);

        const updateMemory = functions.update_user_memory!;
        const deleteMemory = functions.delete_user_memory!;

        const updateResultRaw = await updateMemory({});
        const updateResult = parseJsonResult<{ status: string; action: string }>(updateResultRaw);
        expect(updateResult.status).toBe('disabled');
        expect(updateResult.action).toBe('update');

        const deleteResultRaw = await deleteMemory({});
        const deleteResult = parseJsonResult<{ status: string; action: string }>(deleteResultRaw);
        expect(deleteResult.status).toBe('disabled');
        expect(deleteResult.action).toBe('delete');
    });

    it('stores and retrieves memory through runtime adapter when enabled', async () => {
        const storedContent = 'User is working on an AI patent filing.';
        const adapter: MemoryToolRuntimeAdapter = {
            async retrieveMemories() {
                return [
                    {
                        id: 'mem-1',
                        content: storedContent,
                        isGlobal: false,
                    },
                ];
            },
            async storeMemory(args) {
                return {
                    id: 'mem-1',
                    content: args.content,
                    isGlobal: args.isGlobal,
                };
            },
            async updateMemory(args) {
                return {
                    id: args.memoryId,
                    content: args.content,
                    isGlobal: args.isGlobal ?? false,
                };
            },
            async deleteMemory() {
                return { id: 'mem-1' };
            },
        };
        setMemoryToolRuntimeAdapter(adapter);

        const commitment = new MemoryCommitmentDefinition();
        const functions = commitment.getToolFunctions();
        const storeMemory = functions.store_user_memory!;
        const retrieveMemory = functions.retrieve_user_memory!;
        const updateMemory = functions.update_user_memory!;
        const deleteMemory = functions.delete_user_memory!;
        const runtimeContext = JSON.stringify({
            memory: {
                enabled: true,
                userId: 1,
                username: 'alice',
                agentId: 'agent-1',
                agentName: 'Memory Agent',
                isTeamConversation: false,
            },
        });

        const storeResultRaw = await storeMemory({
            content: storedContent,
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const storeResult = parseJsonResult<{
            action: string;
            status: string;
            memory?: { id?: string; content?: string };
        }>(storeResultRaw);
        expect(storeResult.action).toBe('store');
        expect(storeResult.status).toBe('stored');
        expect(storeResult.memory?.content).toBe(storedContent);

        const retrieveResultRaw = await retrieveMemory({
            query: 'patent',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const retrieveResult = parseJsonResult<{
            action: string;
            status: string;
            memories: Array<{ content?: string }>;
        }>(retrieveResultRaw);
        expect(retrieveResult.action).toBe('retrieve');
        expect(retrieveResult.status).toBe('ok');
        expect(retrieveResult.memories[0]?.content).toBe(storedContent);

        const memoryId = storeResult.memory?.id;
        expect(memoryId).toBe('mem-1');

        const updateResultRaw = await updateMemory({
            memoryId,
            content: 'User switched to an AI trademark filing.',
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const updateResult = parseJsonResult<{
            action: string;
            status: string;
            memory?: {
                id?: string;
                content?: string;
            };
        }>(updateResultRaw);
        expect(updateResult.action).toBe('update');
        expect(updateResult.status).toBe('updated');
        expect(updateResult.memory?.content).toBe('User switched to an AI trademark filing.');

        const deleteResultRaw = await deleteMemory({
            memoryId,
            [TOOL_RUNTIME_CONTEXT_ARGUMENT]: runtimeContext,
        });
        const deleteResult = parseJsonResult<{
            action: string;
            status: string;
            memoryId?: string;
        }>(deleteResultRaw);
        expect(deleteResult.action).toBe('delete');
        expect(deleteResult.status).toBe('deleted');
        expect(deleteResult.memoryId).toBe(memoryId);
    });
});

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { createAgentModelRequirements } from '../../../../src/_packages/core.index'; // <- [🚾]
import type { string_agent_url, string_book } from '../../../../src/_packages/types.index'; // <- [🚾]
import type { AgentCollection } from '../../../../src/collection/agent-collection/AgentCollection';
import { AgentCollectionInSupabase } from '../../../../src/collection/agent-collection/constructors/agent-collection-in-supabase/AgentCollectionInSupabase';
import {
    $provideLocalSqliteSupabase,
    $resetLocalSqliteSupabaseForTests,
} from '../database/sqlite/$provideLocalSqliteSupabase';
import { createServerAgentReferenceResolver } from './agentReferenceResolver/createServerAgentReferenceResolver';
import { createLocalAgentSourceImporter } from './createLocalAgentSourceImporter';
import { resolveAgentStateFromSource } from './resolveAgentStateFromSource';

/**
 * Environment restored after every test so the temporary database never leaks into other suites.
 */
const ORIGINAL_ENVIRONMENT = { ...process.env };

/**
 * Origin the stored agents are served from in these tests.
 */
const LOCAL_SERVER_URL = 'https://local.example';

/**
 * Well-known Adam URL, built exactly the way `getWellKnownAgentUrl('ADAM')` builds it.
 */
const ADAM_AGENT_URL = `${LOCAL_SERVER_URL}/agents/adam` as string_agent_url;

/**
 * Bundled `.core` Adam book, trimmed to the commitments these tests assert on.
 */
const ADAM_BOOK = spaceTrim(`
    Adam

    META VISIBILITY PRIVATE

    FROM @Void

    META FONT Playfair Display, sans-serif
    PERSONA You are a helpful, honest, and intelligent AI assistant.
    RULE Start from Adam.

    CLOSED
`) as string_book;

/**
 * Builds one child book with the given inheritance header.
 *
 * @param inheritanceLine - `FROM ...` lines of the child, empty for a book that declares no parent.
 * @returns Child book source.
 */
function createChildBook(inheritanceLine: string): string_book {
    return spaceTrim(
        (block) => `
            Generic chatter

            META VISIBILITY PUBLIC
            ${block(inheritanceLine)}
            GOAL Keep your projects up to date
            CLOSED
        `,
    ) as string_book;
}

describe('how `resolveAgentStateFromSource` resolves stored agents', () => {
    let temporaryDirectory: string;
    let collection: AgentCollection;

    beforeEach(() => {
        temporaryDirectory = mkdtempSync(join(tmpdir(), 'promptbook-stored-agents-'));
        process.env = {
            ...ORIGINAL_ENVIRONMENT,
            PTBK_AGENTS_SERVER_SQLITE_PATH: join(temporaryDirectory, 'agents-server.sqlite'),
        };
        delete process.env.SERVERS;
        delete process.env.SUPABASE_TABLE_PREFIX;

        $resetLocalSqliteSupabaseForTests();
        collection = new AgentCollectionInSupabase($provideLocalSqliteSupabase(), { tablePrefix: '' });
    });

    afterEach(() => {
        $resetLocalSqliteSupabaseForTests();
        process.env = { ...ORIGINAL_ENVIRONMENT };
        rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    /**
     * Deletes the first Adam and reinstates it, exactly like the Core Agents admin page does.
     *
     * @returns Permanent ids of the deleted leftover and of the Adam that is live afterwards.
     */
    async function reinstateAdamCoreAgent(): Promise<{
        readonly deletedAdamPermanentId: string;
        readonly liveAdamPermanentId: string;
    }> {
        const deletedAdam = await collection.createAgent(ADAM_BOOK);
        await collection.deleteAgent(deletedAdam.permanentId);
        const liveAdam = await collection.createAgent(ADAM_BOOK);

        return {
            deletedAdamPermanentId: deletedAdam.permanentId,
            liveAdamPermanentId: liveAdam.permanentId,
        };
    }

    /**
     * Resolves one child book against the stored agents the same way the server routes do.
     *
     * @param childAgentSource - Child book to resolve.
     * @returns Resolved source of the child.
     */
    async function resolveChildAgentSource(childAgentSource: string_book): Promise<string_book> {
        const agentReferenceResolver = await createServerAgentReferenceResolver({
            agentCollection: collection,
            localServerUrl: LOCAL_SERVER_URL,
        });
        const agentSourceImporter = createLocalAgentSourceImporter({
            collection,
            localServerUrls: [LOCAL_SERVER_URL],
            localAgentUrls: [ADAM_AGENT_URL],
            adamAgentUrl: ADAM_AGENT_URL,
            fallbackResolver: agentReferenceResolver,
        });
        const resolvedAgentState = await resolveAgentStateFromSource(childAgentSource, {
            adamAgentUrl: ADAM_AGENT_URL,
            canonicalAgentUrl: `${LOCAL_SERVER_URL}/agents/generic-chatter` as string_agent_url,
            agentReferenceResolver,
            agentSourceImporter,
        });

        return resolvedAgentState.resolvedAgentSource;
    }

    /**
     * Resolves the effective system message one child book ends up running with.
     *
     * @param childAgentSource - Child book to resolve.
     * @returns System message generated from the resolved child source.
     */
    async function resolveChildSystemMessage(childAgentSource: string_book): Promise<string> {
        const resolvedAgentSource = await resolveChildAgentSource(childAgentSource);
        return (await createAgentModelRequirements(resolvedAgentSource)).systemMessage;
    }

    it('should resolve an agent name to the agent that is live, not to a deleted namesake', async () => {
        const { deletedAdamPermanentId, liveAdamPermanentId } = await reinstateAdamCoreAgent();

        await expect(collection.getAgentPermanentId('adam')).resolves.toBe(liveAdamPermanentId);
        expect(liveAdamPermanentId).not.toBe(deletedAdamPermanentId);
    });

    it('should keep a deleted agent resolvable so the recycle bin can restore it', async () => {
        const deletedAgent = await collection.createAgent(createChildBook('FROM @Void'));
        await collection.deleteAgent(deletedAgent.permanentId);

        await expect(collection.getAgentPermanentId('generic-chatter')).resolves.toBe(deletedAgent.permanentId);
    });

    it('should implicitly inherit from a reinstated Adam exactly like an explicit `FROM @Adam`', async () => {
        await reinstateAdamCoreAgent();

        const systemMessageWithoutFrom = await resolveChildSystemMessage(createChildBook(''));
        const systemMessageWithAtAdam = await resolveChildSystemMessage(createChildBook('FROM @Adam'));
        const systemMessageWithBracedAdam = await resolveChildSystemMessage(createChildBook('FROM {Adam}'));
        const systemMessageWithOverriddenFrom = await resolveChildSystemMessage(
            createChildBook('FROM @aaa\nFROM {bbb ccc}\nFROM {ddd}\nFROM @Adam'),
        );

        expect(systemMessageWithoutFrom).toContain('You are a helpful, honest, and intelligent AI assistant.');
        expect(systemMessageWithoutFrom).toContain('Start from Adam.');
        expect(systemMessageWithoutFrom).toContain('Keep your projects up to date');
        expect(systemMessageWithAtAdam).toBe(systemMessageWithoutFrom);
        expect(systemMessageWithBracedAdam).toBe(systemMessageWithoutFrom);
        expect(systemMessageWithOverriddenFrom).toBe(systemMessageWithoutFrom);
    });

    it('should keep an explicit `FROM @Null` free of the implicit Adam ancestor', async () => {
        await reinstateAdamCoreAgent();

        const resolvedWithNullParent = await resolveChildAgentSource(createChildBook('FROM @Null'));

        expect(resolvedWithNullParent).toContain('FROM @Null');
        expect(resolvedWithNullParent).not.toContain('Start from Adam.');
    });
});

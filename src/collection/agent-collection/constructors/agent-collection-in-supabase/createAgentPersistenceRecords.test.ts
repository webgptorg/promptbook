import { describe, expect, it } from '@jest/globals';
import type { string_book } from '../../../../book-2.0/agent-source/string_book';
import { createAgentPersistenceRecords } from './createAgentPersistenceRecords';

describe('createAgentPersistenceRecords', () => {
    it('builds consistent agent and history insert rows for one new agent', () => {
        const createdAt = '2026-04-13T01:23:45.000Z';
        const agentSource = `
Helper Agent

PERSONA You help with testing.
CLOSED
` as string_book;

        const result = createAgentPersistenceRecords(
            agentSource,
            {
                folderId: 3,
                sortOrder: 7,
                visibility: 'PUBLIC',
            },
            createdAt,
        );

        expect(result.createdAgent.agentName).toBe('helper-agent');
        expect(result.createdAgent.permanentId).toHaveLength(14);
        expect(result.agentInsertRecord).toMatchObject({
            agentName: 'helper-agent',
            createdAt,
            updatedAt: null,
            folderId: 3,
            sortOrder: 7,
            visibility: 'PUBLIC',
        });
        expect(result.createdAgent.meta.visibility).toBe('PUBLIC');
        expect(result.agentInsertRecord.agentSource).toContain('META VISIBILITY PUBLIC');
        expect(result.agentInsertRecord.permanentId).toBe(result.createdAgent.permanentId);
        expect(result.agentHistoryInsertRecord).toMatchObject({
            createdAt,
            agentName: 'helper-agent',
            permanentId: result.createdAgent.permanentId,
            agentHash: result.createdAgent.agentHash,
            previousAgentHash: null,
            agentSource: result.agentInsertRecord.agentSource,
            versionName: null,
        });
    });

    it('uses META VISIBILITY from the book when no creation override is provided', () => {
        const result = createAgentPersistenceRecords(`
Helper Agent
META VISIBILITY private
GOAL Help with testing.
` as string_book);

        expect(result.agentInsertRecord.visibility).toBe('PRIVATE');
        expect(result.agentInsertRecord.agentSource).toContain('META VISIBILITY PRIVATE');
    });

    it('adds default META VISIBILITY when neither input nor book declares it', () => {
        const result = createAgentPersistenceRecords(`
Helper Agent
GOAL Help with testing.
` as string_book);

        expect(result.agentInsertRecord.visibility).toBe('UNLISTED');
        expect(result.agentInsertRecord.agentSource).toContain('META VISIBILITY UNLISTED');
    });
});

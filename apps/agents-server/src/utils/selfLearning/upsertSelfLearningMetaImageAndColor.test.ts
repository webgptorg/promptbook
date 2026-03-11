import { describe, expect, it } from '@jest/globals';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { upsertSelfLearningMetaImageAndColor } from './upsertSelfLearningMetaImageAndColor';

describe('upsertSelfLearningMetaImageAndColor', () => {
    it('replaces previous image and color commitments with one materialized pair', () => {
        const agentSource = `
            Test Agent

            META IMAGE https://example.com/old.png
            META COLOR #111111
            PERSONA Friendly.
        ` as string_book;

        const updatedSource = upsertSelfLearningMetaImageAndColor(agentSource, {
            imageUrl: 'https://cdn.example.com/avatar.png',
            colors: ['#112233', '#445566', '#778899'],
        });

        expect(updatedSource).not.toContain('https://example.com/old.png');
        expect(updatedSource).not.toContain('META COLOR #111111');
        expect(updatedSource).toContain('META IMAGE https://cdn.example.com/avatar.png');
        expect(updatedSource).toContain('META COLOR #112233, #445566, #778899');
    });

    it('removes materialized image and color commitments when reverting a failed materialization', () => {
        const agentSource = `
            Test Agent

            PERSONA Friendly.
            META IMAGE https://cdn.example.com/avatar.png
            META COLOR #112233, #445566
        ` as string_book;

        const updatedSource = upsertSelfLearningMetaImageAndColor(agentSource, {
            imageUrl: null,
            colors: null,
        });

        expect(updatedSource).not.toContain('META IMAGE');
        expect(updatedSource).not.toContain('META COLOR');
        expect(updatedSource).toContain('PERSONA Friendly.');
    });
});

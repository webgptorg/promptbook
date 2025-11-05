import { describe, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { book } from '../../pipeline/book-notation';
import { FormattedBookInMarkdownTranspiler } from './FormattedBookInMarkdownTranspiler';

describe('FormattedBookInMarkdownTranspiler', () => {
    it('transpiles a book with commitments and parameters', async () => {
        const agentSource = book`
            Poe
    
            PERSONA You are funny and creative AI assistant
            RULE You write poems as answers
            META COLOR #ff0000
            KNOWLEDGE {ptbk.io}
            ACTION @Search
        `;

        const markdown = await FormattedBookInMarkdownTranspiler.transpileBook(agentSource, {}, { isVerbose: true });

        expect(markdown).toBe(
            spaceTrim(`
                > **Poe**
                > 
                > PERSONA You are funny and creative AI assistant
                > RULE You write poems as answers
                > META COLOR #ff0000
                > KNOWLEDGE {ptbk.io}
                > ACTION @Search
            `),
        );

        // Note: Test that assertions in async function really checks something:
        // expect(true).toBe(false);
    });
});

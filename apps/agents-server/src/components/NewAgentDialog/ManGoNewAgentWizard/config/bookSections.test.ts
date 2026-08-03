import { describe, expect, it } from '@jest/globals';

import { parseAgentSourceWithCommitments } from '../../../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import { validateBook } from '../../../../../../../src/book-2.0/agent-source/string_book';
import { BOOK_SECTION_PRESETS } from './bookSections';
import { insertBookContentBeforeLearningMarker } from '../lib/bookSource';

/**
 * Minimal valid Book used to test section insertion.
 */
const BASE_BOOK = 'Support Helper\n\nGOAL Answers support questions.\n\nCLOSED';

describe('manGo Book sections', () => {
    it('uses Book-language commitments for every section preset', () => {
        const expectedCommitmentTypes = new Map([
            ['priklady', 'WRITING SAMPLE'],
            ['eskalace', 'RULE'],
            ['podpis', 'MESSAGE SUFFIX'],
            ['zakazana', 'RULE'],
            ['vlastni', 'NOTE'],
        ]);

        for (const preset of BOOK_SECTION_PRESETS) {
            const source = insertBookContentBeforeLearningMarker(BASE_BOOK, [preset.book]);
            const parsedSource = parseAgentSourceWithCommitments(validateBook(source));

            expect(preset.book).not.toMatch(/^##/m);
            expect(parsedSource.commitments.map((commitment) => commitment.type)).toContain(
                expectedCommitmentTypes.get(preset.key),
            );
        }
    });

    it('keeps inserted sections before the final learning-mode marker', () => {
        const source = insertBookContentBeforeLearningMarker(BASE_BOOK, [BOOK_SECTION_PRESETS[0]!.book]);

        expect(source.indexOf('WRITING SAMPLE')).toBeLessThan(source.indexOf('CLOSED'));
        expect(source.trimEnd().endsWith('CLOSED')).toBe(true);
    });
});

import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../../../../version';
import { getPromptbookExportBranding } from './getPromptbookExportBranding';

describe('getPromptbookExportBranding', () => {
    it('reuses Promptbook branding and version metadata', () => {
        const branding = getPromptbookExportBranding();

        expect(branding.productName).toBe('Promptbook');
        expect(branding.commentLines[0]).toBe('Exported with Promptbook.');
        expect(branding.detailLines).toContain(`Promptbook engine version ${PROMPTBOOK_ENGINE_VERSION}`);
        expect(branding.detailLines).toContain(`Book language version ${BOOK_LANGUAGE_VERSION}`);
        expect(branding.metadataSummary).toContain(PROMPTBOOK_ENGINE_VERSION);
        expect(branding.creatorTool).toContain(BOOK_LANGUAGE_VERSION);
    });
});

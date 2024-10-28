import { locateLibreoffice } from './locateLibreoffice';

describe('locating the LibreOffice', () => {
    it('should locate LibreOffice', async () => {
        await expect(locateLibreoffice()).resolves.toMatch(/office/i);
        expect.assertions(1);
    });
});

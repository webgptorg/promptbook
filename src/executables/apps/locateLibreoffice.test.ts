import { describe, expect, it } from '@jest/globals';
import { locateApp } from '../locateApp';
import { locateLibreoffice } from './locateLibreoffice';

jest.mock('../locateApp', () => ({
    locateApp: jest.fn(),
}));

/**
 * Gets the typed mock for the shared application locator.
 *
 * @private internal utility of `locateLibreoffice.test`
 */
function getLocateAppMock(): jest.MockedFunction<typeof locateApp> {
    return locateApp as jest.MockedFunction<typeof locateApp>;
}

describe('configuring the LibreOffice locator', () => {
    it('should use LibreOffice application settings', async () => {
        const EXECUTABLE_PATH = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
        getLocateAppMock().mockResolvedValue(EXECUTABLE_PATH);

        await expect(locateLibreoffice()).resolves.toBe(EXECUTABLE_PATH);
        expect(getLocateAppMock()).toHaveBeenCalledWith({
            appName: 'Libreoffice',
            linuxWhich: 'libreoffice',
            windowsSuffix: '\\LibreOffice\\program\\soffice.exe',
            macOsName: 'LibreOffice',
        });
        expect.assertions(2);
    });
});

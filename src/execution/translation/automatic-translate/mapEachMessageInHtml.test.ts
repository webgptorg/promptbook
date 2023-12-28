import spaceTrim from 'spacetrim';
import { mapEachMessageInHtml } from './mapEachMessageInHtml';

describe('mapping messages in HTML works', () => {
    it('do nothing', () =>
        expect(
            mapEachMessageInHtml({
                html: spaceTrim(`<hr/>`),
                map(message) {
                    return message;
                },
            }),
        ).resolves.toBe(`<hr/>`));

    it('maps', () =>
        expect(
            mapEachMessageInHtml({
                html: spaceTrim(`
                  <a title="map" href="keep">map</a>
                `),
                map(message) {
                    if (spaceTrim(message) === '') {
                        return message;
                    }
                    return `x${message}x`;
                },
            }),
        ).resolves.toBe(
            spaceTrim(`
              <a title="xmapx" href="keep">xmapx</a>
            `),
        ));
});

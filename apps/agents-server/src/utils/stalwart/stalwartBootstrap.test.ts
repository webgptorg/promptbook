import { describe, expect, it } from '@jest/globals';
import { buildStalwartBootstrapValue } from './stalwartBootstrap';

describe('buildStalwartBootstrapValue', () => {
    it('serves the given domain as the default domain of the mail server', () => {
        expect(buildStalwartBootstrapValue('live.ptbk.io')).toMatchObject({
            serverHostname: 'mail.live.ptbk.io',
            defaultDomain: 'live.ptbk.io',
        });
    });

    it('generates DKIM keys so outbound agent mail is signed without any manual step', () => {
        expect(buildStalwartBootstrapValue('live.ptbk.io').generateDkimKeys).toBe(true);
    });

    it('never asks Stalwart for its own certificate, because nginx and certbot own every certificate', () => {
        expect(buildStalwartBootstrapValue('live.ptbk.io').requestTlsCertificate).toBe(false);
    });
});

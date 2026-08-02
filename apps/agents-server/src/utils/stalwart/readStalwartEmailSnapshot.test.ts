import { describe, expect, it } from '@jest/globals';
import { isStalwartEmailSnapshotOperational } from './readStalwartEmailSnapshot';

describe('isStalwartEmailSnapshotOperational', () => {
    it('requires the public mail host DNS to resolve to this VPS', () => {
        expect(
            isStalwartEmailSnapshotOperational({
                isReachable: true,
                domainId: 'domain-id',
                isBridgeAccountConfigured: true,
                isInboundHookConfigured: true,
                mailDnsDiagnostic: { status: 'verified' },
            }),
        ).toBe(true);

        expect(
            isStalwartEmailSnapshotOperational({
                isReachable: true,
                domainId: 'domain-id',
                isBridgeAccountConfigured: true,
                isInboundHookConfigured: true,
                mailDnsDiagnostic: { status: 'misconfigured' },
            }),
        ).toBe(false);
    });
});

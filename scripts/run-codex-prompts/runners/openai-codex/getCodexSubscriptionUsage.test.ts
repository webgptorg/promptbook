import { buildCodexSubscriptionUsage } from './getCodexSubscriptionUsage';

describe('buildCodexSubscriptionUsage', () => {
    it('preserves both primary and secondary rolling limits from one Codex account snapshot', () => {
        const subscriptionUsage = buildCodexSubscriptionUsage({
            rateLimits: {
                primary: {
                    usedPercent: 46,
                    resetsAt: 1_780_000_000,
                    windowDurationMins: 5 * 60,
                },
                secondary: {
                    usedPercent: 21,
                    resetsAt: 1_780_500_000,
                    windowDurationMins: 7 * 24 * 60,
                },
            },
        });

        expect(subscriptionUsage).toEqual({
            limits: [
                { label: '5h', usedPercentage: 46, resetsAt: 1_780_000_000 },
                { label: '7d', usedPercentage: 21, resetsAt: 1_780_500_000 },
            ],
        });
    });

    it('keeps every multi-bucket Codex limit instead of falling back to one historical bucket', () => {
        const subscriptionUsage = buildCodexSubscriptionUsage({
            rateLimits: {
                primary: {
                    usedPercent: 10,
                    windowDurationMins: 5 * 60,
                },
            },
            rateLimitsByLimitId: {
                codex: {
                    limitName: 'Codex',
                    primary: {
                        usedPercent: 46,
                        windowDurationMins: 5 * 60,
                    },
                    secondary: {
                        usedPercent: 21,
                        windowDurationMins: 7 * 24 * 60,
                    },
                },
                image_generation: {
                    limitName: 'Images',
                    primary: {
                        usedPercent: 90,
                        windowDurationMins: 24 * 60,
                    },
                },
            },
        });

        expect(subscriptionUsage).toEqual({
            limits: [
                { label: 'Codex 5h', usedPercentage: 46 },
                { label: 'Codex 7d', usedPercentage: 21 },
                { label: 'Images 1d', usedPercentage: 90 },
            ],
        });
    });

    it('does not report a subscription snapshot when Codex supplied no valid rolling limits', () => {
        expect(
            buildCodexSubscriptionUsage({
                rateLimits: {
                    primary: {
                        usedPercent: 101,
                    },
                },
            }),
        ).toBeUndefined();
    });
});

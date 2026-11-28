import { parseClaudeCodeSubscriptionUsage } from './parseClaudeCodeSubscriptionUsage';

describe('parseClaudeCodeSubscriptionUsage', () => {
    it('preserves every subscription limit emitted by Claude Code', () => {
        const subscriptionUsage = parseClaudeCodeSubscriptionUsage(
            [
                '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed","rateLimitType":"five_hour","utilization":0.46,"resetsAt":1780000000}}',
                '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed","rateLimitType":"seven_day","utilization":21,"resetsAt":1780500000}}',
                '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed_warning","rateLimitType":"seven_day_opus","utilization":0.8,"resetsAt":1780500000}}',
            ].join('\n'),
        );

        expect(subscriptionUsage).toEqual({
            limits: [
                { label: '5h', usedPercentage: 46, resetsAt: 1_780_000_000 },
                { label: '7d', usedPercentage: 21, resetsAt: 1_780_500_000 },
                { label: '7d Opus', usedPercentage: 80, resetsAt: 1_780_500_000 },
            ],
        });
    });

    it('shows a rejected limit as fully consumed even when Claude omitted utilization', () => {
        const subscriptionUsage = parseClaudeCodeSubscriptionUsage(
            '{"type":"rate_limit_event","rate_limit_info":{"status":"rejected","rate_limit_type":"five_hour","resets_at":1780000000}}',
        );

        expect(subscriptionUsage).toEqual({
            limits: [{ label: '5h', usedPercentage: 100, resetsAt: 1_780_000_000 }],
        });
    });

    it('keeps an understandable unique label for a newly introduced limit type', () => {
        const subscriptionUsage = parseClaudeCodeSubscriptionUsage(
            '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed","rate_limit_type":"monthly_priority","utilization":0.12}}',
        );

        expect(subscriptionUsage).toEqual({
            limits: [{ label: 'Monthly Priority', usedPercentage: 12 }],
        });
    });

    it('does not report subscription usage for a stream without limit utilization', () => {
        expect(
            parseClaudeCodeSubscriptionUsage(
                '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed","rateLimitType":"five_hour"}}',
            ),
        ).toBeUndefined();
    });
});

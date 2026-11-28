/** @jest-environment jsdom */

import type { AgentBasicInformation } from '@promptbook-local/types';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { AgentCapabilityChips, HOMEPAGE_CAPABILITY_CHIPS_LIMIT } from './AgentCapabilityChips';

/**
 * Agent fixture with capability labels that should be filtered differently by profile and card views.
 */
const TEST_AGENT = {
    agentName: 'Void Agent',
    agentHash: 'hash-void-agent',
    meta: {},
    personaDescription: null,
    initialMessage: null,
    links: [],
    parameters: [],
    samples: [],
    knowledgeSources: [],
    capabilities: [
        {
            type: 'inheritance',
            label: '{Void}',
            iconName: 'ShieldAlert',
            agentUrl: '{Void}',
        },
        {
            type: 'calendar',
            label: 'Calendar',
            iconName: 'Calendar',
        },
        {
            type: 'privacy',
            label: 'Privacy',
            iconName: 'Shield',
        },
    ],
} as unknown as AgentBasicInformation;

describe('AgentCapabilityChips', () => {
    it('hides the {Void} inheritance capability', () => {
        render(<AgentCapabilityChips agent={TEST_AGENT} maxChips={HOMEPAGE_CAPABILITY_CHIPS_LIMIT} />);

        expect(screen.queryByText('{Void}')).toBeNull();
    });

    it('renders the remaining capability labels', () => {
        render(<AgentCapabilityChips agent={TEST_AGENT} maxChips={HOMEPAGE_CAPABILITY_CHIPS_LIMIT} />);

        expect(screen.queryByText('Calendar')).not.toBeNull();
        expect(screen.queryByText('Privacy')).not.toBeNull();
    });

    it('hides capability types passed through `hiddenCapabilityTypes`', () => {
        render(
            <AgentCapabilityChips
                agent={TEST_AGENT}
                hiddenCapabilityTypes={['privacy']}
                maxChips={HOMEPAGE_CAPABILITY_CHIPS_LIMIT}
                size="compact"
            />,
        );

        expect(screen.queryByText('Calendar')).not.toBeNull();
        expect(screen.queryByText('Privacy')).toBeNull();
    });
});

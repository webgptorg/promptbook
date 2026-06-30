/** @jest-environment jsdom */

import type { AgentBasicInformation } from '@promptbook-local/types';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import {
    AGENT_CARD_HIDDEN_CAPABILITY_TYPES,
    AgentCapabilityChips,
    HOMEPAGE_CAPABILITY_CHIPS_LIMIT,
} from './AgentCapabilityChips';

/**
 * Agent fixture with capability labels that should be filtered differently by profile and card views.
 */
const TEST_AGENT = {
    agentName: 'Clockless Void Agent',
    agentHash: 'hash-clockless-void-agent',
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
            type: 'time',
            label: 'Time',
            iconName: 'Clock',
        },
        {
            type: 'browser',
            label: 'Browser',
            iconName: 'Globe',
        },
        {
            type: 'search-engine',
            label: 'Internet',
            iconName: 'Search',
        },
    ],
} as unknown as AgentBasicInformation;

describe('AgentCapabilityChips', () => {
    it('hides non-card capability labels from homepage agent cards', () => {
        render(
            <AgentCapabilityChips
                agent={TEST_AGENT}
                hiddenCapabilityTypes={AGENT_CARD_HIDDEN_CAPABILITY_TYPES}
                maxChips={HOMEPAGE_CAPABILITY_CHIPS_LIMIT}
                size="compact"
            />,
        );

        expect(screen.queryByText('{Void}')).toBeNull();
        expect(screen.queryByText('Time')).toBeNull();
        expect(screen.queryByText('Browser')).not.toBeNull();
        expect(screen.queryByText('Internet')).not.toBeNull();
    });

    it('keeps the Time capability visible outside the card-specific filter', () => {
        render(<AgentCapabilityChips agent={TEST_AGENT} maxChips={HOMEPAGE_CAPABILITY_CHIPS_LIMIT} />);

        expect(screen.queryByText('{Void}')).toBeNull();
        expect(screen.queryByText('Time')).not.toBeNull();
    });
});

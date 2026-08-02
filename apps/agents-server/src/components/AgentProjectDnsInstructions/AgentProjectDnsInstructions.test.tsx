/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { AgentProjectDnsInstructions } from './AgentProjectDnsInstructions';

describe('AgentProjectDnsInstructions', () => {
    it('recommends a wildcard CNAME before a project domain is assigned', () => {
        render(<AgentProjectDnsInstructions publicIpAddress="203.0.113.42" serverDomain="lts1.ptbk.io" />);

        expect(screen.getByText('Wildcard (all projects, recommended)')).not.toBeNull();
        expect(screen.getByText('*.lts1.ptbk.io')).not.toBeNull();
        expect(screen.getAllByText('lts1.ptbk.io')).not.toHaveLength(0);
        expect(screen.getByText('This covers all generated project domains under lts1.ptbk.io.')).not.toBeNull();
    });
});

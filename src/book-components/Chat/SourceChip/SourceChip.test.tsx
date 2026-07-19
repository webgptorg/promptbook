/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SourceChip } from './SourceChip';

describe('SourceChip', () => {
    it('renders image URL citations with a thumbnail', () => {
        const imageUrl = 'https://example.com/assets/generated/chart.png';
        const { container } = render(
            <SourceChip citation={{ id: '0:0', source: imageUrl }} isCitationIdVisible={false} />,
        );

        const chip = screen.getByRole('button');
        const thumbnail = container.querySelector('img');

        expect(chip.textContent).toContain('example.com/.../chart.png');
        expect(thumbnail?.getAttribute('src')).toBe(imageUrl);
    });

    it('renders raw JSON citations with a readable fallback label', () => {
        const { container } = render(
            <SourceChip
                citation={{ id: '0:1', source: '[{"id":1239608413,"name":"source-file"}]' }}
                isCitationIdVisible={false}
            />,
        );

        expect(screen.getByRole('button').textContent).toContain('JSON file');
        expect(container.querySelector('svg')).not.toBeNull();
    });
});

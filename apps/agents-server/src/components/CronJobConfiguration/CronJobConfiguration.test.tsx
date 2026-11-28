/** @jest-environment jsdom */

import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { CronJobConfiguration } from './CronJobConfiguration';

/**
 * Renders the cron configuration component with a test change handler.
 *
 * @param value - Initial cron expression.
 * @returns Test change handler.
 */
function renderCronJobConfiguration(value: string) {
    const handleChange = jest.fn<(value: string) => void>();

    render(<CronJobConfiguration value={value} onChange={handleChange} />);

    return handleChange;
}

describe('CronJobConfiguration', () => {
    it('converts a daily schedule to a weekly cron expression through the wizard', () => {
        const handleChange = renderCronJobConfiguration('0 0 * * *');

        fireEvent.change(screen.getByLabelText('Repeat'), { target: { value: 'weekly' } });

        expect(handleChange).toHaveBeenCalledWith('0 0 * * 1');
    });

    it('keeps the cron expression editable directly', () => {
        const handleChange = renderCronJobConfiguration('0 0 * * *');

        fireEvent.change(screen.getByLabelText('Cron expression'), { target: { value: '*/15 * * * *' } });

        expect(handleChange).toHaveBeenCalledWith('*/15 * * * *');
    });

    it('derives weekly controls from a matching cron expression', () => {
        const handleChange = renderCronJobConfiguration('30 2 * * 5');
        const repeatSelect = screen.getByLabelText('Repeat') as HTMLSelectElement;
        const daySelect = screen.getByLabelText('Day') as HTMLSelectElement;
        const timeInput = screen.getByLabelText('Time') as HTMLInputElement;

        expect(repeatSelect.value).toBe('weekly');
        expect(daySelect.value).toBe('5');
        expect(timeInput.value).toBe('02:30');

        fireEvent.change(timeInput, { target: { value: '04:15' } });

        expect(handleChange).toHaveBeenCalledWith('15 4 * * 5');
    });
});

/** @jest-environment jsdom */
import { describe, expect, it, jest } from '@jest/globals';
import { executeQuickActionButton } from './executeQuickActionButton';
import * as notifications from '../../components/Notifications/notifications';

/**
 * Browser window extended with local quick-action test state.
 */
type WindowWithQuickActionState = Window & typeof globalThis & { __quickActionRuns?: number };

describe('executeQuickActionButton', () => {
    it('runs quick action code in the current browser context', async () => {
        const actionWindow = window as WindowWithQuickActionState;
        delete actionWindow.__quickActionRuns;

        await executeQuickActionButton(`
            window.__quickActionRuns = (window.__quickActionRuns || 0) + 1;
        `);

        expect(actionWindow.__quickActionRuns).toBe(1);
    });

    it('notifies and rethrows when quick action execution fails', async () => {
        const notifyErrorSpy = jest.spyOn(notifications, 'notifyError').mockReturnValue('notification-1');

        await expect(
            executeQuickActionButton(`
                throw new Error('Quick action failed');
            `),
        ).rejects.toThrow('Quick action failed');

        expect(notifyErrorSpy).toHaveBeenCalledWith('Quick action failed');

        notifyErrorSpy.mockRestore();
    });
});

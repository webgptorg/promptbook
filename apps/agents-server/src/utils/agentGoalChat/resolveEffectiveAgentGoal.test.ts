import { describe, expect, it } from '@jest/globals';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { createAgentGoalChatLifecycleNoteContent } from './createAgentGoalChatNoteContent';
import { resolveEffectiveAgentGoal } from './resolveEffectiveAgentGoal';

describe('resolveEffectiveAgentGoal', () => {
    it('returns the last non-empty GOAL or GOALS commitment', () => {
        const agentSource = `
            Planner

            GOAL Keep the old plan.

            RULE Be careful.

            GOALS Keep projects current and schedule the next useful check.
        ` as string_book;

        expect(resolveEffectiveAgentGoal(agentSource)).toBe(
            'Keep projects current and schedule the next useful check.',
        );
    });

    it('returns null when the source has no goal', () => {
        expect(resolveEffectiveAgentGoal('Helper\n\nRULE Be useful.' as string_book)).toBeNull();
    });

    it('includes the effective goal and scheduling guidance in a modified lifecycle message', () => {
        const content = createAgentGoalChatLifecycleNoteContent({
            event: 'MODIFIED',
            agentName: 'Planner',
            currentGoal: 'Keep projects current.',
        });

        expect(content).toContain('My current goal is:');
        expect(content).toContain('Keep projects current.');
        // Note: Planned messages repeat, so a changed goal means keeping the matching ones and re-planning the rest
        expect(content).toContain('My planned messages keep repeating on their own');
        expect(content).toContain('cancel and re-plan only the ones that do not');
    });
});

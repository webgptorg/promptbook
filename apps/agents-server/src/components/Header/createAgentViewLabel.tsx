import {
    Clock3Icon,
    FileTextIcon,
    FolderKanbanIcon,
    MessageSquareIcon,
    MoreHorizontalIcon,
    NotebookPenIcon,
} from 'lucide-react';
import type { ServerTranslationKey } from '../../languages/ServerTranslationKeys';

/**
 * Views that can be selected for one active agent in the hierarchy.
 *
 * @private type of Header
 */
export type AgentHierarchyView = 'Profile' | 'Chat' | 'Book' | 'Timeouts' | 'Projects' | 'More';

/**
 * Icon displayed next to each hierarchy view label.
 */
const AGENT_VIEW_ICON_MAP: Record<AgentHierarchyView, typeof FileTextIcon> = {
    Profile: FileTextIcon,
    Chat: MessageSquareIcon,
    Book: NotebookPenIcon,
    Timeouts: Clock3Icon,
    Projects: FolderKanbanIcon,
    More: MoreHorizontalIcon,
};

/**
 * Translation key displayed for each hierarchy view label.
 */
const AGENT_VIEW_TRANSLATION_KEY_MAP: Record<AgentHierarchyView, ServerTranslationKey> = {
    Profile: 'common.profile',
    Chat: 'common.chat',
    Book: 'common.book',
    Timeouts: 'common.timeouts',
    Projects: 'common.projects',
    More: 'common.more',
};

/**
 * Builds a labeled view switcher entry that includes an icon.
 *
 * @private function of Header
 */
export function createAgentViewLabel(view: AgentHierarchyView, translate: (key: ServerTranslationKey) => string) {
    const Icon = AGENT_VIEW_ICON_MAP[view];

    return (
        <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-gray-500" aria-hidden />
            <span>{translate(AGENT_VIEW_TRANSLATION_KEY_MAP[view])}</span>
        </span>
    );
}

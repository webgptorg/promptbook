/**
 * Supported writing modes for a story.
 */
export type StoryMode = 'beletrie' | 'dramatic';

/**
 * Persistent Story record stored in `UserData`.
 */
export type Story = {
    id: string;
    content: string;
    mode: StoryMode;
    agentNames: Array<string>;
};

/**
 * Lightweight agent metadata used by the Story picker/panel.
 */
export type StoryAvailableAgent = {
    agentName: string;
    label: string;
};

/**
 * Fallback title used when the first line is empty.
 */
export const DEFAULT_STORY_TITLE = 'Untitled story';

/**
 * Fallback content for a new story.
 */
export const DEFAULT_STORY_CONTENT = `${DEFAULT_STORY_TITLE}\n\n`;

/**
 * Creates a new story record with optional default agents.
 */
export function createStory(defaultAgentNames: ReadonlyArray<string> = []): Story {
    const uniqueAgentNames = Array.from(
        new Set(defaultAgentNames.map((agentName) => agentName.trim()).filter((agentName) => agentName.length > 0)),
    );

    return {
        id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        content: DEFAULT_STORY_CONTENT,
        mode: 'beletrie',
        agentNames: uniqueAgentNames,
    };
}

/**
 * Extracts the story title from the first line of the source.
 */
export function getStoryTitleFromContent(content: string): string {
    const firstLine = content.split(/\r?\n/u, 1)[0]?.trim();
    return firstLine && firstLine.length > 0 ? firstLine : DEFAULT_STORY_TITLE;
}

/**
 * Returns the story source without the first line title.
 */
export function getStoryBodyFromContent(content: string): string {
    const lines = content.split(/\r?\n/u);
    if (lines.length <= 1) {
        return '';
    }

    return lines.slice(1).join('\n').trim();
}

/**
 * Builds a filesystem-safe filename stem from story content.
 */
export function getStoryFilenameStemFromContent(content: string): string {
    const title = getStoryTitleFromContent(content)
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, '-')
        .replace(/^-+|-+$/gu, '');

    return title.length > 0 ? title : 'untitled-story';
}

/**
 * Converts unknown persisted data into a safe list of stories.
 */
export function normalizeStories(value: unknown): Array<Story> {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalizedStories = value
        .map((item) => normalizeStory(item))
        .filter((story): story is Story => story !== null);

    return normalizedStories;
}

/**
 * Converts one unknown persisted item into a safe story.
 */
function normalizeStory(value: unknown): Story | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const story = value as {
        id?: unknown;
        title?: unknown;
        content?: unknown;
        mode?: unknown;
        agents?: unknown;
        agentNames?: unknown;
        actors?: unknown;
    };

    const id = typeof story.id === 'string' && story.id.length > 0 ? story.id : `${Date.now()}`;
    const mode: StoryMode = story.mode === 'dramatic' ? 'dramatic' : 'beletrie';
    const title = typeof story.title === 'string' ? story.title.trim() : '';
    const rawContent = typeof story.content === 'string' ? story.content : '';
    const content =
        rawContent.trim().length > 0 ? rawContent : title.length > 0 ? `${title}\n\n` : DEFAULT_STORY_CONTENT;

    const agentNames = normalizeAgentNames(story.agentNames ?? story.agents ?? story.actors);

    return {
        id,
        content,
        mode,
        agentNames,
    };
}

/**
 * Supports migrated values from old `actors` and `agents` story properties.
 */
function normalizeAgentNames(value: unknown): Array<string> {
    if (!Array.isArray(value)) {
        return [];
    }

    const agentNames = value
        .map((item) => {
            if (typeof item === 'string') {
                return item.trim();
            }

            if (!item || typeof item !== 'object') {
                return '';
            }

            const candidate = item as { agentName?: unknown; name?: unknown };
            if (typeof candidate.agentName === 'string') {
                return candidate.agentName.trim();
            }

            if (typeof candidate.name === 'string') {
                return candidate.name.trim();
            }

            return '';
        })
        .filter((agentName) => agentName.length > 0);

    return Array.from(new Set(agentNames));
}

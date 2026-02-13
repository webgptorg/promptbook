export type StoryAgent = {
    agentName: string;
    displayName: string;
    avatarUrl?: string;
};

type StoryMode = 'beletrie' | 'dramatic';

export type Story = {
    id: string;
    title: string;
    content: string;
    mode: StoryMode;
    actors: Array<StoryAgent>;
};

const DEFAULT_TITLE = 'Untitled story';
const TITLE_LINE_SPLIT = /\r?\n/;
const FILENAME_SAFE = /[^a-zA-Z0-9-_\.]+/g;

function normalizeActor(raw: unknown): StoryAgent | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const rawRecord = raw as Record<string, unknown>;

    const agentName =
        typeof rawRecord.agentName === 'string'
            ? rawRecord.agentName
            : typeof rawRecord.name === 'string'
            ? rawRecord.name
            : undefined;

    if (!agentName) {
        return null;
    }

    const displayName =
        typeof rawRecord.displayName === 'string'
            ? rawRecord.displayName
            : typeof rawRecord.name === 'string'
            ? rawRecord.name
            : agentName;

    const avatarUrl = typeof rawRecord.avatarUrl === 'string' ? rawRecord.avatarUrl : undefined;

    return {
        agentName,
        displayName,
        avatarUrl,
    };
}

/**
 * @public shared helper that derives a story title from the editor content.
 */
export function deriveStoryTitle(content: string, fallback?: string): string {
    const firstLine = (content || '')
        .split(TITLE_LINE_SPLIT)
        .map((line) => line.trim())
        .find((line) => line.length > 0);

    return firstLine || fallback || DEFAULT_TITLE;
}

/**
 * @public shared helper that ensures a story object contains normalized fields.
 */
export function normalizeStory(storyData: Partial<Story> & { id: string }): Story {
    const content = storyData.content || '';
    const mode = storyData.mode === 'dramatic' ? 'dramatic' : 'beletrie';
    const title = deriveStoryTitle(content, storyData.title);
    const actors = Array.isArray(storyData.actors)
        ? storyData.actors
              .map((actor) => normalizeActor(actor))
              .filter((actor): actor is StoryAgent => actor !== null)
        : [];

    return {
        id: storyData.id,
        content,
        mode,
        title,
        actors,
    };
}

/**
 * @public shared helper that turns a story title into a safe filename.
 */
export function sanitizeStoryFilename(title: string): string {
    const value = (title || DEFAULT_TITLE).trim().replace(FILENAME_SAFE, '_');
    return value.length > 0 ? value : DEFAULT_TITLE;
}

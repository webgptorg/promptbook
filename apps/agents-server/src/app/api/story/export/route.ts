import { NextRequest, NextResponse } from 'next/server';
import { getStories } from '../../../experiments/story/actions';
import {
    getStoryBodyFromContent,
    getStoryFilenameStemFromContent,
    getStoryTitleFromContent,
} from '../../../experiments/story/storyUtils';

const EXPERIMENTAL_NOTICE = `
---
**EXPERIMENTAL**
This story was generated using an experimental app. Features may change or be removed at any time.
---
`;

/**
 * Exports a story as text or markdown.
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const storyId = searchParams.get('storyId');
        const format = searchParams.get('format') || 'txt';

        const stories = await getStories();
        const story = stories.find((s) => s.id === storyId);

        if (!story) {
            return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        }

        let content = '';
        let contentType = '';
        let filename = '';

        if (format === 'txt') {
            content = `${story.content}\n\n${EXPERIMENTAL_NOTICE}`;
            contentType = 'text/plain';
            filename = `${getStoryFilenameStemFromContent(story.content)}.txt`;
        } else if (format === 'md') {
            const storyBody = getStoryBodyFromContent(story.content);
            content = `# ${getStoryTitleFromContent(story.content)}\n\n${storyBody}\n\n${EXPERIMENTAL_NOTICE}`;
            contentType = 'text/markdown';
            filename = `${getStoryFilenameStemFromContent(story.content)}.md`;
        } else {
            return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
        }

        return new NextResponse(content, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Export story error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

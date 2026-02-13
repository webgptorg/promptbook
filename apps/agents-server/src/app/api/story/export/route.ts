import { NextRequest, NextResponse } from 'next/server';
import { getStories } from '../../../story/actions';

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

        const experimentalNotice = `
---
**EXPERIMENTAL**
This story was generated using an experimental app. Features may change or be removed at any time.
---
`;

        if (format === 'txt') {
            content = `${story.title}\n\n${story.content}\n\n${experimentalNotice}`;
            contentType = 'text/plain';
            filename = `${story.title}.txt`;
        } else if (format === 'md') {
            content = `# ${story.title}\n\n${story.content}\n\n${experimentalNotice}`;
            contentType = 'text/markdown';
            filename = `${story.title}.md`;
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

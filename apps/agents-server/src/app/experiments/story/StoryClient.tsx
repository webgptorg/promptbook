import { BookEditor } from '@promptbook-local/components';
import { validateBook } from '@promptbook-local/core';
import { useEffect, useState } from 'react';
import { ActorsPanel } from './ActorsPanel';
import { Actor, getStories, saveStories, Story } from './actions';

export function StoryClient() {
    const [stories, setStories] = useState<Story[]>([]);
    const [activeStoryId, setActiveStoryId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getStories().then((stories) => {
            setStories(stories);
            if (stories.length > 0) {
                setActiveStoryId(stories[0].id);
            }
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!isLoading) {
            saveStories(stories);
        }
    }, [stories, isLoading]);

    const activeStory = stories.find((story) => story.id === activeStoryId);

    const handleAddStory = () => {
        const newStory: Story = {
            id: Date.now().toString(),
            title: 'New Story',
            content: '',
            mode: 'beletrie',
            actors: [
                { name: 'Rabbit', avatarUrl: '/samples/avatars/rabbit.png' },
                { name: 'Fox', avatarUrl: '/samples/avatars/fox.png' },
            ],
        };
        setStories([...stories, newStory]);
        setActiveStoryId(newStory.id);
    };

    const handleDeleteStory = (id: string) => {
        setStories(stories.filter((story) => story.id !== id));
        if (activeStoryId === id) {
            setActiveStoryId(stories[0]?.id || '');
        }
    };

    const handleRenameStory = (id: string, newTitle: string) => {
        setStories(stories.map((story) => (story.id === id ? { ...story, title: newTitle } : story)));
    };

    const handleContentChange = (newContent: string) => {
        setStories(stories.map((story) => (story.id === activeStoryId ? { ...story, content: newContent } : story)));
    };

    const handleAddActor = (actor: Actor) => {
        setStories(
            stories.map((story) =>
                story.id === activeStoryId ? { ...story, actors: [...story.actors, actor] } : story,
            ),
        );
    };

    const handleActorClick = (actor: Actor) => {
        const newContent =
            activeStory!.mode === 'dramatic'
                ? `${activeStory!.content}\n\n**${actor.name}:** `
                : `${activeStory!.content}\n\n`;

        // TODO: Here we would call the agent
        const continuation = actor.name === 'Rabbit' ? 'It was a sad day.' : 'It was a happy day.';

        handleContentChange(newContent + continuation);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!activeStory) {
        return (
            <div className="flex justify-center items-center h-full">
                <button onClick={handleAddStory} className="p-4 bg-blue-500 text-white rounded">
                    Create your first story
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="bg-yellow-100 border-b border-yellow-400 text-yellow-700 px-4 py-3" role="alert">
                <p className="font-bold">Experimental App</p>
                <p className="text-sm">This is an experimental app. Features may change or be removed at any time.</p>
            </div>
            <div className="flex h-full">
                <div className="w-1/4 bg-gray-50 p-4 border-r">
                    <h2 className="text-xl font-bold mb-4">Stories</h2>
                    <ul>
                        {stories.map((story) => (
                            <li key={story.id} className="mb-2">
                                <button
                                    onClick={() => setActiveStoryId(story.id)}
                                    className={`w-full text-left p-2 rounded ${
                                        story.id === activeStoryId ? 'bg-blue-100' : ''
                                    }`}
                                >
                                    {story.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button onClick={handleAddStory} className="mt-4 p-2 bg-blue-500 text-white rounded">
                        New Story
                    </button>
                </div>
                <div className="w-3/4 flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <input
                            type="text"
                            value={activeStory.title}
                            onChange={(e) => handleRenameStory(activeStory.id, e.target.value)}
                            className="text-2xl font-bold w-full"
                        />
                        <select
                            value={activeStory.mode}
                            onChange={(e) =>
                                setStories(
                                    stories.map((story) =>
                                        story.id === activeStoryId
                                            ? { ...story, mode: e.target.value as 'beletrie' | 'dramatic' }
                                            : story,
                                    ),
                                )
                            }
                            className="ml-4 p-2 border rounded"
                        >
                            <option value="beletrie">Beletrie</option>
                            <option value="dramatic">Dramatic</option>
                        </select>
                        <button
                            onClick={() => handleDeleteStory(activeStory.id)}
                            className="ml-4 p-2 bg-red-500 text-white rounded"
                        >
                            Delete
                        </button>
                    </div>
                    <div className="p-4 border-b">
                        <span className="font-bold mr-2">Export as:</span>
                        <a
                            href={`/api/story/export?storyId=${activeStory.id}&format=txt`}
                            download
                            className="mr-2 p-2 bg-gray-200 rounded"
                        >
                            TXT
                        </a>
                        <a
                            href={`/api/story/export?storyId=${activeStory.id}&format=md`}
                            download
                            className="p-2 bg-gray-200 rounded"
                        >
                            Markdown
                        </a>
                    </div>
                    <div className="flex-grow p-4">
                        <BookEditor
                            value={validateBook(activeStory.content)}
                            onChange={(newSource) => {
                                handleContentChange(newSource);
                            }}
                            isReadonly={false}
                        />
                    </div>
                    <ActorsPanel
                        actors={activeStory.actors}
                        onActorClick={handleActorClick}
                        onAddActor={handleAddActor}
                    />
                </div>
            </div>
        </div>
    );
}

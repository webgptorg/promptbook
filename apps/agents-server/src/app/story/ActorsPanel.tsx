'use client';

import Image from 'next/image';
import { AgentPalette } from './AgentPalette';
import { Actor } from './actions';

type ActorsPanelProps = {
    actors: Actor[];
    onActorClick: (actor: Actor) => void;
    onAddActor: (actor: Actor) => void;
};

export function ActorsPanel({ actors, onActorClick, onAddActor }: ActorsPanelProps) {
    return (
        <div className="bg-gray-100 p-4 border-t">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold">Actors</h3>
                <AgentPalette onAddActor={onAddActor} />
            </div>
            <div className="flex gap-4">
                {actors.map((actor) => (
                    <button
                        key={actor.name}
                        onClick={() => onActorClick(actor)}
                        className="flex flex-col items-center gap-2"
                    >
                        {actor.avatarUrl ? (
                            <Image
                                src={actor.avatarUrl}
                                alt={actor.name}
                                width={64}
                                height={64}
                                className="w-16 h-16 rounded-full"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                                {actor.name.charAt(0)}
                            </div>
                        )}
                        <span>{actor.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

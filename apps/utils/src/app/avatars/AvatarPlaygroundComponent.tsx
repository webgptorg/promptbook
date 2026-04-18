'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Avatar, AVATAR_VISUALS, type AvatarDefinition } from '../../../../../src/avatars';
import {
    isSameAvatarPlaygroundState,
    parseAvatarPlaygroundState,
    stringifyAvatarPlaygroundState,
    type AvatarPlaygroundState,
} from './avatarPlaygroundUrlState';

/**
 * Sample avatars used to demonstrate determinism and variation.
 */
const SAMPLE_AVATARS: ReadonlyArray<AvatarDefinition> = [
    {
        agentName: 'Nebula Librarian',
        agentHash: '9ef4d6b45a8f0d73c4fb7b2f90d914550dfc8bcf5a053510c5bf09d37df8c7f3',
        colors: ['#6d5dfc', '#0ea5e9', '#f97316'],
    },
    {
        agentName: 'Coral Cartographer',
        agentHash: 'd4a374ffcf1098cc5fb2cf1f99fceec7a215af4db10d91ee480711833e0f8af4',
        colors: ['#14b8a6', '#fb7185', '#facc15'],
    },
    {
        agentName: 'Iron Meadow',
        agentHash: '4bb8c8f82fe4d0f8fb2ee73e8dfdd203ea9a6787d942e0b65156fd280c46861e',
        colors: ['#64748b', '#22c55e', '#f8fafc'],
    },
    {
        agentName: 'Solar Whisper',
        agentHash: 'a908df4a7f36d4bf35ea96916a523379d0a27cbe370ec0d17b4cdf953f0350e2',
        colors: ['#f59e0b', '#ef4444', '#312e81'],
    },
];

/**
 * Renders the interactive avatar playground.
 */
export function AvatarPlaygroundComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [avatarPlaygroundState, setAvatarPlaygroundState] = useState<AvatarPlaygroundState>(() =>
        parseAvatarPlaygroundState(searchParams),
    );
    const { agentName, agentHash, visualId, colors } = avatarPlaygroundState;

    useEffect(() => {
        const nextAvatarPlaygroundState = parseAvatarPlaygroundState(searchParams);

        setAvatarPlaygroundState((currentAvatarPlaygroundState) =>
            isSameAvatarPlaygroundState(currentAvatarPlaygroundState, nextAvatarPlaygroundState)
                ? currentAvatarPlaygroundState
                : nextAvatarPlaygroundState,
        );
    }, [searchParams]);

    useEffect(() => {
        const nextQueryString = stringifyAvatarPlaygroundState(avatarPlaygroundState, searchParams);
        const currentQueryString = searchParams.toString();

        if (nextQueryString === currentQueryString) {
            return;
        }

        router.replace(`${pathname}${nextQueryString ? `?${nextQueryString}` : ''}`, { scroll: false });
    }, [avatarPlaygroundState, pathname, router, searchParams]);

    const avatarDefinition = useMemo<AvatarDefinition>(
        () => ({
            agentName,
            agentHash,
            colors,
        }),
        [agentHash, agentName, colors],
    );

    return (
        <div className="space-y-10">
            <section className="grid gap-6 xl:grid-cols-[380px,1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-semibold text-slate-900">Avatar input</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        The same <code>name + hash + colors</code> always produce the same avatar. Changing any field
                        shifts the deterministic seed.
                    </p>

                    <div className="mt-6 space-y-5">
                        <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Agent name</span>
                            <input
                                type="text"
                                value={agentName}
                                onChange={(event) =>
                                    updateAvatarPlaygroundState('agentName', event.target.value, setAvatarPlaygroundState)
                                }
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                        </label>

                        <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Agent hash</span>
                            <textarea
                                value={agentHash}
                                onChange={(event) =>
                                    updateAvatarPlaygroundState('agentHash', event.target.value, setAvatarPlaygroundState)
                                }
                                rows={3}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                        </label>

                        <div className="space-y-3">
                            <span className="text-sm font-medium text-slate-700">Agent colors</span>
                            {colors.map((color, colorIndex) => (
                                <div key={colorIndex} className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={normalizeHexColor(color)}
                                        onChange={(event) =>
                                            updateColor(colorIndex, event.target.value, setAvatarPlaygroundState)
                                        }
                                        className="h-12 w-14 rounded-lg border border-slate-200 bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={color}
                                        onChange={(event) =>
                                            updateColor(colorIndex, event.target.value, setAvatarPlaygroundState)
                                        }
                                        className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <span className="text-sm font-medium text-slate-700">Selected visual</span>
                            <div className="grid gap-2">
                                {AVATAR_VISUALS.map((avatarVisual) => (
                                    <button
                                        key={avatarVisual.id}
                                        type="button"
                                        onClick={() =>
                                            updateAvatarPlaygroundVisualId(avatarVisual.id, setAvatarPlaygroundState)
                                        }
                                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                                            visualId === avatarVisual.id
                                                ? 'border-blue-600 bg-blue-50 shadow-sm'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="font-semibold text-slate-900">{avatarVisual.title}</div>
                                        <div className="mt-1 text-sm text-slate-600">{avatarVisual.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-4">
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-blue-100">
                                Live preview
                            </span>
                            <div>
                                <h2 className="text-3xl font-semibold">{agentName || 'Anonymous Agent'}</h2>
                                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                                    {AVATAR_VISUALS.find((avatarVisual) => avatarVisual.id === visualId)?.description}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {colors.map((color, colorIndex) => (
                                    <span
                                        key={`${color}-${colorIndex}`}
                                        className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/90"
                                        style={{ backgroundColor: normalizeHexColor(color) }}
                                    >
                                        {color}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-4">
                            <Avatar avatarDefinition={avatarDefinition} visualId={visualId} size={280} />
                            <code className="max-w-[280px] truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {agentHash || 'no-hash'}
                            </code>
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">All built-in visuals</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Each renderer consumes the same avatar input object while expressing it with a different canvas
                        technique.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {AVATAR_VISUALS.map((avatarVisual) => (
                        <article
                            key={avatarVisual.id}
                            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">{avatarVisual.title}</h3>
                                    <p className="mt-2 text-sm text-slate-600">{avatarVisual.description}</p>
                                </div>
                                <Avatar avatarDefinition={avatarDefinition} visualId={avatarVisual.id} size={120} />
                            </div>
                            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                <span className="font-semibold text-slate-800">Visual id:</span> {avatarVisual.id}
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Deterministic sample gallery</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        These fixed inputs are useful for spotting regressions if any visual starts changing unexpectedly.
                    </p>
                </div>

                <div className="grid gap-4">
                    {SAMPLE_AVATARS.map((sampleAvatar) => (
                        <article key={sampleAvatar.agentHash} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold text-slate-900">{sampleAvatar.agentName}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {sampleAvatar.colors.map((color) => (
                                            <span
                                                key={color}
                                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                                                style={{ backgroundColor: normalizeHexColor(color) }}
                                            >
                                                {color}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    {AVATAR_VISUALS.map((avatarVisual) => (
                                        <div key={`${sampleAvatar.agentHash}-${avatarVisual.id}`} className="text-center">
                                            <Avatar avatarDefinition={sampleAvatar} visualId={avatarVisual.id} size={112} />
                                            <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                                {avatarVisual.title}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

/**
 * Updates one editable color field.
 *
 * @param colorIndex Edited color index.
 * @param nextColor New color string.
 * @param setAvatarPlaygroundState React state setter.
 */
function updateColor(
    colorIndex: number,
    nextColor: string,
    setAvatarPlaygroundState: React.Dispatch<React.SetStateAction<AvatarPlaygroundState>>,
): void {
    setAvatarPlaygroundState((currentAvatarPlaygroundState) => ({
        ...currentAvatarPlaygroundState,
        colors: currentAvatarPlaygroundState.colors.map((color, index) => (index === colorIndex ? nextColor : color)),
    }));
}

/**
 * Updates one top-level avatar playground field.
 *
 * @param field Updated field key.
 * @param value Updated field value.
 * @param setAvatarPlaygroundState React state setter.
 */
function updateAvatarPlaygroundState(
    field: 'agentName' | 'agentHash',
    value: string,
    setAvatarPlaygroundState: React.Dispatch<React.SetStateAction<AvatarPlaygroundState>>,
): void {
    setAvatarPlaygroundState((currentAvatarPlaygroundState) => ({
        ...currentAvatarPlaygroundState,
        [field]: value,
    }));
}

/**
 * Updates the selected avatar visual.
 *
 * @param visualId Updated visual id.
 * @param setAvatarPlaygroundState React state setter.
 */
function updateAvatarPlaygroundVisualId(
    visualId: AvatarPlaygroundState['visualId'],
    setAvatarPlaygroundState: React.Dispatch<React.SetStateAction<AvatarPlaygroundState>>,
): void {
    setAvatarPlaygroundState((currentAvatarPlaygroundState) => ({
        ...currentAvatarPlaygroundState,
        visualId,
    }));
}

/**
 * Ensures `<input type="color"/>` always receives a valid hex string.
 *
 * @param color Raw color string.
 * @returns Valid hex color.
 */
function normalizeHexColor(color: string): string {
    if (/^#(?:[0-9a-fA-F]{6})$/.test(color)) {
        return color;
    }

    return '#000000';
}
